"use server"

import { redirect } from "next/navigation"

export type ActionState = {
  error?: string
}

export async function startAzureOidcSignInAction() {
  redirect("/auth/oidc/login")
}
