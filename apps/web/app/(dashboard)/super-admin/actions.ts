"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROLES, type Role } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
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
  const admin = getAdminClientOrThrow()

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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  })

  if (error) {
    return { kind: "error", message: error.message }
  }

  const user = data.user

  if (!user) {
    return { kind: "error", message: "Supabase did not return the created user." }
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      role,
    },
    { onConflict: "id" },
  )

  if (profileError) {
    return { kind: "error", message: profileError.message }
  }

  revalidatePath("/super-admin")

  return { kind: "success", message: `Created ${email} as ${role}.` }
}

export async function updateUserRoleAction(
  _state: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  const context = await requireSuperAdmin()
  const admin = getAdminClientOrThrow()

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

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .single()

  if (profileError) {
    return { kind: "error", message: profileError.message }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId)

  if (updateError) {
    return { kind: "error", message: updateError.message }
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: profile.full_name,
      role,
    },
  })

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

function getAdminClientOrThrow() {
  const admin = createAdminClient()

  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.")
  }

  return admin
}
