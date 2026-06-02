"use server"

import { redirect } from "next/navigation"

export async function startAzureOidcSignInAction() {
  redirect("/auth/oidc/login")
}
