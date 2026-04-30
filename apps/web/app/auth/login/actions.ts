"use server"

import { redirect } from "next/navigation"
import type { Role } from "@coursebridge/workflow"
import { getAuthService } from "@/lib/auth/service"

const devUsers: Record<Role, string> = {
  ta: "ta@coursebridge.dev",
  admin: "admin@coursebridge.dev",
  communications: "communications@coursebridge.dev",
  instructor: "instructor@coursebridge.dev",
  super_admin: "superadmin@coursebridge.dev",
}

const devPassword = "CourseBridgeDev123!"

export type ActionState = {
  error?: string
}

export async function signInWithPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const { error } = await getAuthService().signInWithPassword(email, password)

  if (error) {
    return { error }
  }

  redirect("/dashboard")
}

export async function signInAsDevRole(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/auth/login")
  }

  const role = String(formData.get("role") ?? "") as Role
  const email = devUsers[role]

  if (!email) {
    redirect("/auth/login")
  }

  const { error } = await getAuthService().signInWithPassword(email, devPassword)

  if (error) {
    redirect("/auth/login")
  }

  redirect("/dashboard")
}
