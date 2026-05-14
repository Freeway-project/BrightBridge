import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { isReadonlyMode } from "@/lib/system-migration"
import type { ReactNode } from "react"

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers()

  if (isReadonlyMode(headerStore.get("host"))) {
    redirect("/maintenance")
  }

  return children
}
