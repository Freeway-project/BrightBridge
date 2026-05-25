import "server-only"

import type { Role } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import type { BillboardPost, GlobalChatMessage } from "./types"

const COMMUNITY_READ_ROLES: readonly Role[] = [
  "super_admin",
  "admin_full",
  "admin_viewer",
  "standard_user",
  "instructor",
]

function assertCanReadCommunity(role: Role) {
  if (!COMMUNITY_READ_ROLES.includes(role)) {
    throw new Error("You do not have access to community features.")
  }
}

export async function listGlobalChatMessages(options?: {
  limit?: number
  beforeCreatedAt?: string
}): Promise<GlobalChatMessage[]> {
  const context = await requireProfile()
  assertCanReadCommunity(context.profile.role)

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)
  const admin = getSupabaseAdminClientOrThrow()

  let query = admin
    .from("global_chat_messages")
    .select("id,author_id,author_name,author_role,body,created_at,edited_at,deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (options?.beforeCreatedAt) {
    query = query.lt("created_at", options.beforeCreatedAt)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Could not load global chat messages: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role as Role,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  }))
}

function inActiveWindow(nowMs: number, startsAt: string | null, endsAt: string | null) {
  const startsMs = startsAt ? Date.parse(startsAt) : null
  const endsMs = endsAt ? Date.parse(endsAt) : null

  if (startsMs && nowMs < startsMs) return false
  if (endsMs && nowMs > endsMs) return false
  return true
}

export async function listActiveBillboardPosts(): Promise<BillboardPost[]> {
  const context = await requireProfile()
  assertCanReadCommunity(context.profile.role)

  const admin = getSupabaseAdminClientOrThrow()

  const { data, error } = await admin
    .from("billboard_posts")
    .select("id,title,body,priority,is_active,starts_at,ends_at,created_by,created_at,updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Could not load billboard posts: ${error.message}`)
  }

  const nowMs = Date.now()

  return (data ?? [])
    .filter((row) => inActiveWindow(nowMs, row.starts_at, row.ends_at))
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      priority: row.priority,
      isActive: row.is_active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
}

export async function listAllBillboardPosts(): Promise<BillboardPost[]> {
  const context = await requireProfile()
  if (context.profile.role !== "admin_full" && context.profile.role !== "super_admin") {
    throw new Error("Only admins can manage billboard posts.")
  }

  const admin = getSupabaseAdminClientOrThrow()

  const { data, error } = await admin
    .from("billboard_posts")
    .select("id,title,body,priority,is_active,starts_at,ends_at,created_by,created_at,updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Could not load billboard posts: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}
