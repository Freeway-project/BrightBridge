"use server"

import { revalidatePath } from "next/cache"
import type { Role } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import type {
  BillboardPost,
  CreateBillboardInput,
  GlobalChatMessage,
  UpdateBillboardInput,
} from "./types"

const CHAT_POST_ROLES: readonly Role[] = [
  "super_admin",
  "admin_full",
  "standard_user",
  "instructor",
]

const BILLBOARD_MANAGE_ROLES: readonly Role[] = ["super_admin", "admin_full"]

function assertCanPostChat(role: Role) {
  if (!CHAT_POST_ROLES.includes(role)) {
    throw new Error("You do not have permission to post in global chat.")
  }
}

function assertCanManageBillboard(role: Role) {
  if (!BILLBOARD_MANAGE_ROLES.includes(role)) {
    throw new Error("You do not have permission to manage billboard posts.")
  }
}

export async function sendGlobalChatMessage(input: { body: string }): Promise<GlobalChatMessage> {
  const context = await requireProfile()
  assertCanPostChat(context.profile.role)

  const body = input.body.trim()
  if (!body) {
    throw new Error("Message cannot be empty.")
  }
  if (body.length > 500) {
    throw new Error("Message cannot exceed 500 characters.")
  }

  const admin = getSupabaseAdminClientOrThrow()

  const { data, error } = await admin
    .from("global_chat_messages")
    .insert({
      author_id: context.profile.id,
      author_name: context.profile.fullName?.trim() || context.profile.email,
      author_role: context.profile.role,
      body,
    })
    .select("id,author_id,author_name,author_role,body,created_at,edited_at,deleted_at")
    .single()

  if (error) {
    throw new Error(`Could not send global chat message: ${error.message}`)
  }

  revalidatePath("/community")

  return {
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    authorRole: data.author_role as Role,
    body: data.body,
    createdAt: data.created_at,
    editedAt: data.edited_at,
    deletedAt: data.deleted_at,
  }
}

export async function createBillboardPost(input: CreateBillboardInput): Promise<BillboardPost> {
  const context = await requireProfile()
  assertCanManageBillboard(context.profile.role)

  const title = input.title.trim()
  const body = input.body.trim()

  if (!title || title.length > 140) {
    throw new Error("Billboard title must be between 1 and 140 characters.")
  }
  if (!body || body.length > 2000) {
    throw new Error("Billboard body must be between 1 and 2000 characters.")
  }

  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    throw new Error("Billboard end time must be after start time.")
  }

  const admin = getSupabaseAdminClientOrThrow()

  const { data, error } = await admin
    .from("billboard_posts")
    .insert({
      title,
      body,
      priority: input.priority ?? "info",
      is_active: input.isActive ?? true,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      created_by: context.profile.id,
    })
    .select("id,title,body,priority,is_active,starts_at,ends_at,created_by,created_at,updated_at")
    .single()

  if (error) {
    throw new Error(`Could not create billboard post: ${error.message}`)
  }

  revalidatePath("/community")
  revalidatePath("/admin")

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    priority: data.priority,
    isActive: data.is_active,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateBillboardPost(
  postId: string,
  input: UpdateBillboardInput,
): Promise<BillboardPost> {
  const context = await requireProfile()
  assertCanManageBillboard(context.profile.role)

  if (!postId) {
    throw new Error("Billboard post id is required.")
  }

  const updates: Record<string, unknown> = {}

  if (typeof input.title !== "undefined") {
    const title = input.title.trim()
    if (!title || title.length > 140) {
      throw new Error("Billboard title must be between 1 and 140 characters.")
    }
    updates.title = title
  }

  if (typeof input.body !== "undefined") {
    const body = input.body.trim()
    if (!body || body.length > 2000) {
      throw new Error("Billboard body must be between 1 and 2000 characters.")
    }
    updates.body = body
  }

  if (typeof input.priority !== "undefined") {
    updates.priority = input.priority
  }

  if (typeof input.isActive !== "undefined") {
    updates.is_active = input.isActive
  }

  if (typeof input.startsAt !== "undefined") {
    updates.starts_at = input.startsAt
  }

  if (typeof input.endsAt !== "undefined") {
    updates.ends_at = input.endsAt
  }

  const startsAt = (updates.starts_at as string | null | undefined) ?? null
  const endsAt = (updates.ends_at as string | null | undefined) ?? null
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Error("Billboard end time must be after start time.")
  }

  const admin = getSupabaseAdminClientOrThrow()

  const { data, error } = await admin
    .from("billboard_posts")
    .update(updates)
    .eq("id", postId)
    .select("id,title,body,priority,is_active,starts_at,ends_at,created_by,created_at,updated_at")
    .single()

  if (error) {
    throw new Error(`Could not update billboard post: ${error.message}`)
  }

  revalidatePath("/community")
  revalidatePath("/admin")

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    priority: data.priority,
    isActive: data.is_active,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function softDeleteGlobalChatMessage(messageId: string) {
  const context = await requireProfile()
  if (context.profile.role !== "admin_full" && context.profile.role !== "super_admin") {
    throw new Error("Only admins can remove chat messages.")
  }

  const admin = getSupabaseAdminClientOrThrow()
  const { error } = await admin
    .from("global_chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)

  if (error) {
    throw new Error(`Could not remove global chat message: ${error.message}`)
  }

  revalidatePath("/community")
}
