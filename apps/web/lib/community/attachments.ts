"use server"

import { randomUUID } from "crypto"
import type { Role } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import type { CommunityAttachment, CommunityAttachmentTargetType } from "./types"

const COMMUNITY_READ_ROLES: readonly Role[] = [
  "super_admin",
  "admin_full",
  "admin_viewer",
  "standard_user",
  "instructor",
]
const CHAT_POST_ROLES: readonly Role[] = ["super_admin", "admin_full", "standard_user", "instructor"]
const BILLBOARD_MANAGE_ROLES: readonly Role[] = ["super_admin", "admin_full"]

const STORAGE_BUCKET = "community-assets"
const MAX_FILE_BYTES = 50 * 1024 * 1024

function assertCanReadCommunity(role: Role) {
  if (!COMMUNITY_READ_ROLES.includes(role)) {
    throw new Error("You do not have access to community features.")
  }
}

function assertCanUploadForTarget(role: Role, targetType: CommunityAttachmentTargetType) {
  if (targetType === "chat" && !CHAT_POST_ROLES.includes(role)) {
    throw new Error("You do not have permission to upload chat attachments.")
  }
  if (targetType === "billboard" && !BILLBOARD_MANAGE_ROLES.includes(role)) {
    throw new Error("You do not have permission to upload billboard attachments.")
  }
}

function normalizeFilename(fileName: string) {
  return fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file"
}

function toAttachment(row: any, signedUrl: string | null): CommunityAttachment {
  return {
    id: row.id,
    chatMessageId: row.chat_message_id,
    billboardPostId: row.billboard_post_id,
    bucketName: row.bucket_name,
    objectPath: row.object_path,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    status: row.status,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    signedUrl,
  }
}

async function ensureTargetExists(targetType: CommunityAttachmentTargetType, targetId: string) {
  const admin = getSupabaseAdminClientOrThrow()

  if (targetType === "chat") {
    const { data, error } = await admin
      .from("global_chat_messages")
      .select("id")
      .eq("id", targetId)
      .single()
    if (error || !data) throw new Error("Chat message not found.")
    return
  }

  const { data, error } = await admin
    .from("billboard_posts")
    .select("id")
    .eq("id", targetId)
    .single()
  if (error || !data) throw new Error("Billboard post not found.")
}

export async function createCommunityAttachmentUpload(input: {
  targetType: CommunityAttachmentTargetType
  targetId: string
  fileName: string
  contentType: string
  byteSize: number
}) {
  const context = await requireProfile()
  assertCanUploadForTarget(context.profile.role, input.targetType)

  const targetId = input.targetId.trim()
  if (!targetId) throw new Error("Target id is required.")

  const contentType = input.contentType.trim()
  if (!contentType) throw new Error("contentType is required.")

  const byteSize = Math.floor(input.byteSize)
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > MAX_FILE_BYTES) {
    throw new Error("Invalid file size. Max allowed is 50 MB.")
  }

  await ensureTargetExists(input.targetType, targetId)

  const sanitizedName = normalizeFilename(input.fileName)
  const objectPath = `${input.targetType}/${targetId}/${randomUUID()}-${sanitizedName}`
  const admin = getSupabaseAdminClientOrThrow()

  const insertPayload: Record<string, unknown> = {
    bucket_name: STORAGE_BUCKET,
    object_path: objectPath,
    original_filename: sanitizedName,
    content_type: contentType,
    byte_size: byteSize,
    uploaded_by: context.profile.id,
    status: "pending",
  }

  if (input.targetType === "chat") {
    insertPayload.chat_message_id = targetId
  } else {
    insertPayload.billboard_post_id = targetId
  }

  const { data: row, error: insertError } = await admin
    .from("community_attachments")
    .insert(insertPayload)
    .select("id")
    .single()

  if (insertError || !row) {
    throw new Error(`Could not create attachment metadata: ${insertError?.message ?? "unknown error"}`)
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(objectPath)

  if (signedError || !signed) {
    await admin.from("community_attachments").delete().eq("id", row.id)
    throw new Error(`Could not create upload URL: ${signedError?.message ?? "unknown error"}`)
  }

  return {
    attachmentId: row.id,
    bucketName: STORAGE_BUCKET,
    objectPath,
    path: signed.path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  }
}

export async function markCommunityAttachmentUploaded(attachmentId: string) {
  const context = await requireProfile()
  const admin = getSupabaseAdminClientOrThrow()

  const { data: existing, error: fetchError } = await admin
    .from("community_attachments")
    .select("id,uploaded_by,status")
    .eq("id", attachmentId)
    .single()

  if (fetchError || !existing) {
    throw new Error("Attachment not found.")
  }

  const isOwner = existing.uploaded_by === context.profile.id
  const isAdmin = context.profile.role === "admin_full" || context.profile.role === "super_admin"
  if (!isOwner && !isAdmin) {
    throw new Error("You do not have permission to finalize this attachment.")
  }

  if (existing.status === "ready") return

  const { error } = await admin
    .from("community_attachments")
    .update({ status: "ready" })
    .eq("id", attachmentId)

  if (error) {
    throw new Error(`Could not finalize attachment: ${error.message}`)
  }
}

export async function listCommunityAttachments(input: {
  targetType: CommunityAttachmentTargetType
  targetId: string
}): Promise<CommunityAttachment[]> {
  const context = await requireProfile()
  assertCanReadCommunity(context.profile.role)

  const targetId = input.targetId.trim()
  if (!targetId) throw new Error("Target id is required.")

  const admin = getSupabaseAdminClientOrThrow()

  let query = admin
    .from("community_attachments")
    .select("id,chat_message_id,billboard_post_id,bucket_name,object_path,original_filename,content_type,byte_size,status,uploaded_by,created_at,updated_at")
    .eq("status", "ready")
    .order("created_at", { ascending: true })

  query = input.targetType === "chat"
    ? query.eq("chat_message_id", targetId)
    : query.eq("billboard_post_id", targetId)

  const { data, error } = await query
  if (error) {
    throw new Error(`Could not load attachments: ${error.message}`)
  }

  const rows = data ?? []
  const signedUrlMap = new Map<string, string | null>()

  await Promise.all(
    rows.map(async (row) => {
      const { data: signedData } = await admin.storage
        .from(row.bucket_name)
        .createSignedUrl(row.object_path, 60 * 60)
      signedUrlMap.set(row.id, signedData?.signedUrl ?? null)
    }),
  )

  return rows.map((row) => toAttachment(row, signedUrlMap.get(row.id) ?? null))
}
