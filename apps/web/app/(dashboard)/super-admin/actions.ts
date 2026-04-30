"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROLES, type Role } from "@coursebridge/workflow"
import { getAuthService } from "@/lib/auth/service"
import { requireProfile } from "@/lib/auth/context"
import { getProfileRepository } from "@/lib/repositories"

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
  const password = String(formData.get("password") ?? "")
  const role = String(formData.get("role") ?? "") as Role

  if (!email || !password || !fullName) {
    return { kind: "error", message: "Name, email, and password are required." }
  }

  if (!ROLES.includes(role)) {
    return { kind: "error", message: "Select a valid role." }
  }

  try {
    const user = await getAuthService().createUserWithPassword({
      email,
      password,
      emailConfirm: true,
      userMetadata: {
        full_name: fullName,
        role,
      },
    })

    await getProfileRepository().upsertProfile({
      id: user.id,
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

  return { kind: "success", message: `Created ${email} as ${role}.` }
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

  try {
    await getProfileRepository().updateProfileRole(userId, role)
    await getAuthService().updateUserMetadata(userId, {
      full_name: profile.fullName,
      role,
    })
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not update user role.",
    }
  }

  revalidatePath("/super-admin")

  return { kind: "success", message: `Updated ${profile.email} to ${role}.` }
}

async function requireSuperAdmin() {
  const context = await requireProfile()

  if (context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  return context
}
