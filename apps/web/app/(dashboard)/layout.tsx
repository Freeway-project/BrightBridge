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
import { OnlinePresenceTracker } from "@/components/providers/online-presence-tracker"
import { getDeploymentVersion } from "@/lib/deployment-version"
import { ChatUpdater } from "@/components/layout/chat-updater"
import { stopImpersonatingAction } from "@/app/dashboard/actions"
import { getHierarchyRepository } from "@/lib/repositories"
import { LEADERSHIP_TITLES } from "@/lib/hierarchy/leadership"
import { isBirthdayUser } from "@/lib/birthday/config"
import { BirthdaySkinController } from "@/components/birthday/birthday-skin-controller"
import { BirthdayDecorations } from "@/components/birthday/birthday-decorations"
import { BirthdaySurprise } from "@/components/birthday/birthday-surprise"

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

  const isImpersonating = context.kind === "profile" && !!context.impersonatorProfile
  const impersonatorRole = context.kind === "profile" ? context.impersonatorProfile?.role : undefined
  const impersonatorName = context.kind === "profile" ? context.impersonatorProfile?.fullName : undefined

  const hierarchy = getHierarchyRepository()
  const userUnits = context.kind === "profile" ? await hierarchy.getUserUnits(context.profile.id) : []
  const isHierarchyLeader = userUnits.some((u) => LEADERSHIP_TITLES.has(u.title))

  // Birthday surprise — one user, one day. Gated entirely by isBirthdayUser.
  const isBirthday = isBirthdayUser(context.profile)
  const firstName = (context.profile.fullName ?? "").trim().split(/\s+/)[0] || ""

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const sidebarOpen = sidebarCookie !== "false"

  return (
    <TweakProvider>
      <OnlinePresenceTracker userId={context.userId} name={context.profile.fullName} email={context.email ?? ""} role={role} />
      <NotificationProvider userId={context.userId} role={role}>
        <SidebarProvider defaultOpen={sidebarOpen}>
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar
              initialVersion={currentVersion}
              role={role}
              userName={userName}
              isImpersonating={isImpersonating}
              impersonatorRole={impersonatorRole}
              impersonatorName={impersonatorName ?? undefined}
              isHierarchyLeader={isHierarchyLeader}
              isBirthday={isBirthday}
            />
            <DashboardContentShell>
              {process.env.NEXT_PUBLIC_CHAT_ENABLED === "true" && <ChatUpdater userId={context.userId} />}
              {isImpersonating && (
                <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-bold flex justify-between items-center shrink-0 border-b border-amber-600 shadow-sm animate-in slide-in-from-top duration-300">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-900 animate-pulse" />
                    <span>
                      Impersonating: <strong className="text-amber-950 font-black">{userName}</strong> ({role})
                      <span className="opacity-75 font-normal ml-1">
                        (original: {impersonatorName} as {impersonatorRole})
                      </span>
                    </span>
                  </div>
                  <form action={stopImpersonatingAction}>
                    <button
                      type="submit"
                      className="bg-amber-950 text-amber-100 hover:bg-amber-900 transition-colors px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                    >
                      Stop Impersonating
                    </button>
                  </form>
                </div>
              )}
              {children}
            </DashboardContentShell>
            {isBirthday && (
              <>
                <BirthdaySkinController />
                <BirthdayDecorations name={firstName} />
                <BirthdaySurprise name={firstName} />
              </>
            )}
          </div>
        </SidebarProvider>
      </NotificationProvider>
    </TweakProvider>
  )
}
