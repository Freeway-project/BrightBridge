import { Topbar } from "@/components/layout/topbar"
import { InstitutionPanel } from "@/components/super-admin/institution-panel"
import { getSuperAdminData, getPaginatedSuperAdminCourses, getPaginatedUsers, getPaginatedSuperAdminSupportMessages, getOpenSupportMessageCount, getPaginatedAuditEvents } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { SuperAdminTabs } from "./_components/super-admin-tabs"
import { CoursesView } from "@/components/super-admin/courses-view"
import { UsersView } from "@/components/super-admin/users-view"
import { AuditView } from "@/components/super-admin/audit-view"
import { MigrationPanel } from "../admin/_components/migration-panel"
import { AdminAssignmentPanel } from "../admin/_components/admin-assignment-panel"
import { EscalationsTable } from "../admin/_components/escalations-table"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { getOpenEscalations } from "@/lib/services/escalations"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminRefreshWrapper } from "../admin/_components/admin-refresh-wrapper"
import { getLatestMigrationReport } from "@/lib/migration/report"
import { FeatureAnnouncementToast } from "@/components/shared/feature-announcement-toast"
import { AnalyticsView } from "@/components/super-admin/analytics-view"
import { SupportMessagesView } from "@/components/super-admin/support-messages-view"

type SearchParams = Record<string, string | string[] | undefined>

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function SuperAdminDashboardPage({ searchParams }: Props) {
  const context = await getAuthContext()

  if (context.kind !== "profile" || context.profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const page = Number(resolvedSearchParams?.page ?? 1)
  const search = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : ""

  const [
    data,
    coursesPage,
    usersPage,
    unassignedPage,
    openEscalations,
    tas,
    migrationReport,
    supportMessagesPage,
    openSupportCount,
    auditPage,
  ] = await Promise.all([
    getSuperAdminData(),
    getPaginatedSuperAdminCourses(page, 50, search),
    getPaginatedUsers(page, 50, search),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "course_created" }),
    getOpenEscalations(),
    getProfilesByRole("standard_user"),
    getLatestMigrationReport(),
    getPaginatedSuperAdminSupportMessages(page, 50, search),
    getOpenSupportMessageCount(),
    getPaginatedAuditEvents(1, 30),
  ])

  return (
    <>
      <FeatureAnnouncementToast role={context.profile.role} />
      <Topbar title="Super Admin Dashboard" subtitle="System-wide management and monitoring" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <AdminRefreshWrapper title="Super Admin Dashboard">
          <SuperAdminTabs
            unassignedCount={unassignedPage.total}
            openEscalationsCount={openEscalations.length}
            openSupportCount={openSupportCount}
            supportPanel={<SupportMessagesView result={supportMessagesPage} search={search} />}
            institutionPanel={<InstitutionPanel data={data} storageKey="super-admin-institution" />}
            coursesPanel={<CoursesView result={coursesPage} search={search} />}
            usersPanel={<UsersView result={usersPage} search={search} />}
            assignPanel={
              <AdminAssignmentPanel
                courses={unassignedPage.data.filter(c => c.ta === null)}
                tas={tas}
              />
            }
            escalationsPanel={<EscalationsTable escalations={openEscalations} />}
            migrationPanel={<MigrationPanel report={migrationReport} />}
            auditPanel={<AuditView initial={auditPage} />}
            analyticsPanel={<AnalyticsView />}
          />
        </AdminRefreshWrapper>
      </TweakableContent>
    </>
  )
}
