"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROLES, type Role } from "@coursebridge/workflow"
import { randomUUID } from "node:crypto"
import { requireProfile } from "@/lib/auth/context"
import { getProfileRepository, getHierarchyRepository } from "@/lib/repositories"
import { getPaginatedAuditEvents } from "@/lib/super-admin/queries"
import type { PaginatedResult, AuditEvent } from "@/lib/repositories/contracts"
import { syncRoleChannel } from "@/lib/chat/membership"
import { hashPassword } from "@/lib/auth/service"
import { createAdminClient } from "@/lib/supabase/admin"

export type ManageUserState = {
  kind: "idle" | "success" | "error"
  message: string | null
}

export async function createUserAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  await requireSuperAdmin()

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const fullName = String(formData.get("fullName") ?? "").trim()
  const role = String(formData.get("role") ?? "") as Role
  const password = String(formData.get("password") ?? "").trim()

  if (!email || !fullName) {
    return { kind: "error", message: "Name and email are required." }
  }

  if (!ROLES.includes(role)) {
    return { kind: "error", message: "Select a valid role." }
  }

  if (!password || password.length < 8) {
    return { kind: "error", message: "Password must be at least 8 characters." }
  }

  try {
    const profiles = getProfileRepository()
    const existing = await profiles.getProfileByEmail(email)

    if (existing) {
      return { kind: "error", message: `An account already exists for ${email}. Use the role dropdown or reset-password button to modify it.` }
    }

    const userId = randomUUID()
    await profiles.upsertProfile({ id: userId, email, fullName, role })

    const hash = await hashPassword(password)
    await profiles.setPasswordHash(userId, hash)
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not create user.",
    }
  }

  revalidatePath("/super-admin")

  return { kind: "success", message: `Created ${email} as ${role}.` }
}

export async function resetUserPasswordAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  await requireSuperAdmin()

  const userId = String(formData.get("userId") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()

  if (!userId) {
    return { kind: "error", message: "Missing user." }
  }

  if (!password || password.length < 8) {
    return { kind: "error", message: "Password must be at least 8 characters." }
  }

  try {
    const profile = await getProfileRepository().getProfileById(userId)
    if (!profile) {
      return { kind: "error", message: "User not found." }
    }
    if (profile.role === "super_admin") {
      return { kind: "error", message: "Super admin passwords cannot be reset from this panel." }
    }
    const hash = await hashPassword(password)
    await getProfileRepository().setPasswordHash(userId, hash)
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not reset password.",
    }
  }

  revalidatePath("/super-admin")
  return { kind: "success", message: "Password updated." }
}

export async function updateUserRoleAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  const context = await requireSuperAdmin()

  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "") as Role

  if (!userId) {
    return { kind: "error", message: "Missing user." }
  }

  if (!ROLES.includes(role)) {
    return { kind: "error", message: "Select a valid role." }
  }

  if (userId === context.profile.id && role !== "super_admin") {
    return { kind: "error", message: "You cannot remove your own super admin role." }
  }

  const profile = await getProfileRepository().getProfileById(userId)

  if (!profile) {
    return { kind: "error", message: "User profile not found." }
  }

  const oldRole = profile.role

  try {
    await getProfileRepository().updateProfileRole(userId, role)
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not update user role.",
    }
  }

  try {
    if (oldRole) await syncRoleChannel(oldRole)
    await syncRoleChannel(role)
  } catch (e) { console.error("syncRoleChannel failed:", e) }

  revalidatePath("/super-admin")

  return { kind: "success", message: `Updated ${profile.email} to ${role}.` }
}


export async function addUnitMemberAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  await requireOrgManager()

  const profileId = String(formData.get("profileId") ?? "")
  const orgUnitId = String(formData.get("orgUnitId") ?? "")
  const title = String(formData.get("title") ?? "").trim()

  if (!profileId || !orgUnitId || !title) {
    return { kind: "error", message: "User, unit, and title are required." }
  }

  try {
    await getHierarchyRepository().addMember({ profileId, orgUnitId, title })
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not add member.",
    }
  }

  revalidatePath("/super-admin")
  revalidatePath("/admin")
  revalidatePath("/hierarchy")
  revalidatePath("/provost")
  return { kind: "success", message: "Added member to unit." }
}

export async function removeUnitMemberAction(memberId: string): Promise<void> {
  await requireOrgManager()
  await getHierarchyRepository().removeMember(memberId)
  revalidatePath("/super-admin")
  revalidatePath("/admin")
  revalidatePath("/hierarchy")
  revalidatePath("/provost")
}

// Fetches one page of audit events for the Audit Trail's infinite scroll.
// Gated to super_admin like the rest of this panel.
export async function loadMoreAuditEvents(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AuditEvent>> {
  await requireSuperAdmin()
  return getPaginatedAuditEvents(page, pageSize)
}

// ─── Announcement banner ──────────────────────────────────────────────────────

export type AnnouncementState = {
  kind: "idle" | "success" | "error"
  message: string | null
}

export async function publishAnnouncementAction(
  _state: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const context = await requireSuperAdmin()
  const supabase = createAdminClient()
  if (!supabase) return { kind: "error", message: "Database unavailable." }

  const message = String(formData.get("message") ?? "").trim()
  const severity = String(formData.get("severity") ?? "info")
  const isActive = formData.get("is_active") === "true"

  if (!message) return { kind: "error", message: "Message is required." }
  if (message.length > 280) return { kind: "error", message: "Message must be 280 characters or fewer." }
  if (!["info", "warning", "critical"].includes(severity)) {
    return { kind: "error", message: "Invalid severity." }
  }

  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from("announcements")
    .select("id")
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from("announcements")
      .update({ message, severity, is_active: isActive, created_by_id: context.profile.id, updated_at: now })
      .eq("id", existing.id)
    if (error) return { kind: "error", message: error.message }
  } else {
    const { error } = await supabase
      .from("announcements")
      .insert({ message, severity, is_active: isActive, created_by_id: context.profile.id })
    if (error) return { kind: "error", message: error.message }
  }

  revalidatePath("/", "layout")
  return { kind: "success", message: isActive ? "Announcement published." : "Draft saved." }
}

export async function clearAnnouncementAction(): Promise<AnnouncementState> {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  if (!supabase) return { kind: "error", message: "Database unavailable." }

  await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  revalidatePath("/", "layout")
  return { kind: "success", message: "Announcement cleared." }
}

// ─────────────────────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const context = await requireProfile()

  if (context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  return context
}

// Org-chart management is shared by super_admin and admin_full (institution-wide
// oversight). Provost is read-only oversight. User/role management stays super_admin-only.
async function requireOrgManager() {
  const context = await requireProfile()

  if (
    context.profile.role !== "super_admin" &&
    context.profile.role !== "admin_full"
  ) {
    redirect("/dashboard")
  }

  return context
}
