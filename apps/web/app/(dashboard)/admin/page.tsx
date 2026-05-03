import { Topbar } from "@/components/layout/topbar"
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"
import { AdminTabs } from "./_components/admin-tabs"

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

  const [coursesPage, unassignedPage, tas] = await Promise.all([
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
  ])

  return (
    <>
      <Topbar title="Admin" subtitle="Manage courses, assignments, and review progress" />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 bg-background">
        <AdminTabs
          unassignedCount={unassignedPage.total}
          coursesPanel={<AssignedCoursesTable page={coursesPage} tas={tas} />}
          assignPanel={<AdminAssignmentPanel courses={unassignedPage.data} tas={tas} />}
        />
      </div>
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
