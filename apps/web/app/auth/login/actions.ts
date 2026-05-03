"use server"

import { redirect } from "next/navigation"
import type { Role } from "@coursebridge/workflow"
import { getAuthService } from "@/lib/auth/service"

import { DEV_ACCOUNTS } from "./dev-accounts"

const DEV_PASSWORD = "CourseBridgeDev123!"

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

export async function signInAsDevEmail(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/auth/login")
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!DEV_ACCOUNTS.some((a) => a.email === email)) {
    redirect("/auth/login")
  }

  const { error } = await getAuthService().signInWithPassword(email, DEV_PASSWORD)

  if (error) {
    redirect("/auth/login")
  }

  redirect("/dashboard")
}
