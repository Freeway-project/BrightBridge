import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { headers } from "next/headers"
import { AppSidebar } from "@/components/layout/sidebar"
import { getAuthContext } from "@/lib/auth/context"
import type { ReactNode } from "react"
import { TweakProvider } from "@/components/shared/tweak-provider"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardContentShell } from "@/components/layout/dashboard-content-shell"
import { isReadonlyMode } from "@/lib/system-migration"
import { PostHogIdentifier } from "@/components/providers/posthog-identifier"
import { OnlinePresenceTracker } from "@/components/providers/online-presence-tracker"
import { MemeProvider } from "@/components/providers/meme-provider"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers()

  if (isReadonlyMode(headerStore.get("host"))) {
    redirect("/maintenance")
  }

  const context = await getAuthContext()
  const currentVersion = process.env.VERCEL_GIT_COMMIT_SHA || "development"

  if (context.kind === "anonymous") {
    redirect("/auth/login")
  }

  if (context.kind === "missing_profile") {
    redirect("/auth/login")
  }

  const role = context.profile.role
  const userName = context.profile.fullName ?? context.email ?? ""

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const sidebarOpen = sidebarCookie !== "false"

  return (
    <TweakProvider>
      <PostHogIdentifier userId={context.userId} email={context.email ?? ""} name={context.profile.fullName} role={role} />
      <OnlinePresenceTracker userId={context.userId} name={context.profile.fullName} email={context.email ?? ""} role={role} />
      <NotificationProvider userId={context.userId} role={role}>
        <MemeProvider>
          <SidebarProvider defaultOpen={sidebarOpen}>
            <div className="flex h-screen w-full overflow-hidden bg-background">
              <AppSidebar initialVersion={currentVersion} role={role} userName={userName} />
              <DashboardContentShell>
                {children}
              </DashboardContentShell>
            </div>
          </SidebarProvider>
        </MemeProvider>
      </NotificationProvider>
    </TweakProvider>
  )
}
