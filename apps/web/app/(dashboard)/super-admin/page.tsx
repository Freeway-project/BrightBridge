import { Topbar } from "@/components/layout/topbar"
import { OverviewView } from "@/components/super-admin/overview-view"
import { getSuperAdminData, getPaginatedSuperAdminCourses, getPaginatedUsers } from "@/lib/super-admin/queries"
import { getAuthContext } from "@/lib/auth/context"
import { redirect } from "next/navigation"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { SuperAdminTabs } from "./_components/super-admin-tabs"
import { CoursesView } from "@/components/super-admin/courses-view"
import { UsersView } from "@/components/super-admin/users-view"
import { OrganizationView } from "@/components/super-admin/organization-view"
import { AuditView } from "@/components/super-admin/audit-view"
import { MigrationPanel } from "../admin/_components/migration-panel"
import { AdminAssignmentPanel } from "../admin/_components/admin-assignment-panel"
import { EscalationsTable } from "../admin/_components/escalations-table"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { getOpenEscalations } from "@/lib/services/escalations"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminRefreshWrapper } from "../admin/_components/admin-refresh-wrapper"

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
    tas
  ] = await Promise.all([
    getSuperAdminData(),
    getPaginatedSuperAdminCourses(page, 50, search),
    getPaginatedUsers(page, 50, search),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "course_created" }),
    getOpenEscalations(),
    getProfilesByRole("standard_user"),
  ])

  return (
    <>
      <Topbar title="Super Admin Dashboard" subtitle="System-wide management and monitoring" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <AdminRefreshWrapper title="Super Admin Dashboard">
          <SuperAdminTabs
            unassignedCount={unassignedPage.total}
            openEscalationsCount={openEscalations.length}
            overviewPanel={<OverviewView data={data} />}
            coursesPanel={<CoursesView result={coursesPage} search={search} />}
            usersPanel={<UsersView result={usersPage} search={search} />}
            assignPanel={
              <AdminAssignmentPanel
                courses={unassignedPage.data.filter(c => c.ta === null)}
                tas={tas}
              />
            }
            escalationsPanel={<EscalationsTable escalations={openEscalations} />}
            migrationPanel={<MigrationPanel />}
            organizationPanel={<OrganizationView data={data} />}
            auditPanel={<AuditView data={data} />}
          />
        </AdminRefreshWrapper>
      </TweakableContent>
    </>
  )
}
