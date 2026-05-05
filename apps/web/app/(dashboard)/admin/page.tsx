import { Topbar } from "@/components/layout/topbar"
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { getOpenEscalations } from "@/lib/services/escalations"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"
import { AdminTabs } from "./_components/admin-tabs"
import { EscalationsTable } from "./_components/escalations-table"
import { CompletedCoursesTable } from "./_components/completed-courses-table"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { AdminRefreshWrapper } from "./_components/admin-refresh-wrapper"

type SearchParams = Record<string, string | string[] | undefined>

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const page = parsePositiveInt(resolvedSearchParams?.page, 1)
  const pageSize = parsePositiveInt(resolvedSearchParams?.pageSize, 50)
  const search = getSingleParam(resolvedSearchParams?.search)
  const status = parseCourseStatus(getSingleParam(resolvedSearchParams?.status))
  const taProfileId = getSingleParam(resolvedSearchParams?.ta)

  const [coursesPage, unassignedPage, tas, openEscalations, completedPage] = await Promise.all([
    getAdminCoursesPage({
      page,
      pageSize,
      search,
      status,
      taProfileId,
    }),
    getAdminCoursesPage({
      page: 1,
      pageSize: 200,
      status: "course_created",
    }),
    getProfilesByRole("standard_user"),
    getOpenEscalations(),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "final_approved" }),
  ])

  return (
    <>
      <Topbar title="Admin" subtitle="Manage courses, assignments, and review progress" />
      <TweakableContent className="flex-1 overflow-y-auto p-6 bg-background">
        <AdminRefreshWrapper title="Admin Dashboard">
          <AdminTabs
            unassignedCount={unassignedPage.total}
            openEscalationsCount={openEscalations.length}
            coursesPanel={<AssignedCoursesTable page={coursesPage} tas={tas} />}
            assignPanel={
              <AdminAssignmentPanel
                courses={unassignedPage.data.filter(c => c.ta === null)}
                tas={tas}
              />
            }
            escalationsPanel={<EscalationsTable escalations={openEscalations} />}
            completedPanel={<CompletedCoursesTable courses={completedPage.data} />}
          />
        </AdminRefreshWrapper>
      </TweakableContent>
    </>
  )
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parsePositiveInt(value: string | string[] | undefined, fallback: number): number {
  const raw = getSingleParam(value)
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.floor(parsed)
}

function parseCourseStatus(value: string | undefined): CourseStatus | undefined {
  if (!value) {
    return undefined
  }

  return COURSE_STATUSES.includes(value as CourseStatus) ? (value as CourseStatus) : undefined
}
