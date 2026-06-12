"use server"

import { redirect } from "next/navigation"
import { getProfileRepository } from "@/lib/repositories"
import { verifyPassword, mintSession } from "@/lib/auth/service"

export type SignInState = {
  error?: string
}

export async function signInAction(_state: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const profiles = getProfileRepository()
  const row = await profiles.getPasswordHashByEmail(email)

  if (!row || !row.hash) {
    return { error: "Invalid email or password." }
  }

  const valid = await verifyPassword(password, row.hash)
  if (!valid) {
    return { error: "Invalid email or password." }
  }

  const profile = await profiles.getProfileById(row.id)

  await mintSession({
    sub: row.id,
    email,
    fullName: profile?.fullName ?? null,
  })

  redirect("/dashboard")
}
