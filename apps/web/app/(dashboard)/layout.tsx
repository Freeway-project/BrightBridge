import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { headers } from "next/headers"
import { AppSidebar } from "@/components/layout/sidebar"
import { ProvostOnboardingTour } from "@/components/provost/provost-onboarding-tour"
import { getAuthContext } from "@/lib/auth/context"
import type { ReactNode } from "react"
import { TweakProvider } from "@/components/shared/tweak-provider"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardContentShell } from "@/components/layout/dashboard-content-shell"
import { isReadonlyMode } from "@/lib/system-migration"
import { OnlinePresenceTracker } from "@/components/providers/online-presence-tracker"
import { getDeploymentVersion } from "@/lib/deployment-version"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers()

  if (isReadonlyMode(headerStore.get("host"))) {
    redirect("/maintenance")
  }

  const context = await getAuthContext()
  const currentVersion = getDeploymentVersion()

  if (context.kind === "anonymous") {
    redirect("/auth/login")
  }

  if (context.kind === "missing_profile") {
    // Signed in via Azure but no CourseBridge profile/role — send to a terminal
    // page instead of /auth/login, which would silently SSO back here and loop.
    redirect("/auth/no-access")
  }

  const role = context.profile.role
  const userName = context.profile.fullName ?? context.email ?? ""

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const sidebarOpen = sidebarCookie !== "false"

  return (
    <TweakProvider>
      <OnlinePresenceTracker userId={context.userId} name={context.profile.fullName} email={context.email ?? ""} role={role} />
      <NotificationProvider userId={context.userId} role={role}>
        <SidebarProvider defaultOpen={sidebarOpen}>
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar initialVersion={currentVersion} role={role} userName={userName} />
            <ProvostOnboardingTour role={role} />
            <DashboardContentShell>
              {children}
            </DashboardContentShell>
          </div>
        </SidebarProvider>
      </NotificationProvider>
    </TweakProvider>
  )
}
