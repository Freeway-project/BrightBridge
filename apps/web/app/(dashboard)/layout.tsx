import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { getAuthContext } from "@/lib/auth/context"
import type { ReactNode } from "react"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const context = await getAuthContext()

  if (context.kind === "anonymous") {
    redirect("/auth/login")
  }

  if (context.kind === "missing_profile") {
    redirect("/auth/login")
  }

  const role = context.profile.role
  const userName = context.profile.fullName ?? context.email ?? ""

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={role} userName={userName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
