import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/layout/sidebar"
import { getAuthContext } from "@/lib/auth/context"
import type { ReactNode } from "react"
import { TweakProvider } from "@/components/shared/tweak-provider"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { SidebarProvider } from "@/components/ui/sidebar"

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
    <TweakProvider>
      <NotificationProvider userId={context.userId} role={role}>
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar role={role} userName={userName} />
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </NotificationProvider>
    </TweakProvider>
  )
}
