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

  if (!email || !fullName) {
    return { kind: "error", message: "Name and email are required." }
  }

  if (!ROLES.includes(role)) {
    return { kind: "error", message: "Select a valid role." }
  }

  try {
    // We don't mint credentials — users authenticate via Azure OIDC. This action
    // just provisions the profile row so PBAC can match them on first sign-in
    // (auth/context resolves the OIDC sub → profile by email when the id doesn't
    // match yet).
    const profiles = getProfileRepository()
    const existing = await profiles.getProfileByEmail(email)
    const userId = existing?.id ?? randomUUID()

    await profiles.upsertProfile({
      id: userId,
      email,
      fullName,
      role,
    })
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not create user.",
    }
  }

  revalidatePath("/super-admin")

  return { kind: "success", message: `Provisioned ${email} as ${role}. They sign in via Microsoft.` }
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

export async function createUnitAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  await requireOrgManager()

  const name = String(formData.get("name") ?? "").trim()
  const type = String(formData.get("type") ?? "").trim()
  const parentId = String(formData.get("parentId") ?? "") || null

  if (!name || !type) {
    return { kind: "error", message: "Name and type are required." }
  }

  try {
    await getHierarchyRepository().createUnit({ name, type, parentId })
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not create unit.",
    }
  }

  revalidatePath("/super-admin")
  revalidatePath("/provost")
  return { kind: "success", message: `Created unit ${name}.` }
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
  revalidatePath("/provost")
  return { kind: "success", message: "Added member to unit." }
}

export async function removeUnitMemberAction(memberId: string): Promise<void> {
  await requireOrgManager()
  await getHierarchyRepository().removeMember(memberId)
  revalidatePath("/super-admin")
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

async function requireSuperAdmin() {
  const context = await requireProfile()

  if (context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  return context
}

// Org-chart management is shared by super_admin, provost, and admin_full
// (institution-wide oversight). User/role management stays super_admin-only.
async function requireOrgManager() {
  const context = await requireProfile()

  if (
    context.profile.role !== "super_admin" &&
    context.profile.role !== "provost" &&
    context.profile.role !== "admin_full"
  ) {
    redirect("/dashboard")
  }

  return context
}
