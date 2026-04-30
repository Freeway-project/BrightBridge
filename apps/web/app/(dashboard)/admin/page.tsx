import { Topbar } from "@/components/layout/topbar"
import { COURSE_STATUSES, type CourseStatus } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage } from "@/lib/admin/queries"
import { getProfilesByRole } from "@/lib/services/profiles"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"

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

  const [assignedPage, unassignedPage, tas] = await Promise.all([
    getAdminCoursesPage({
      page,
      pageSize,
      search,
      status,
      taProfileId,
      assignedOnly: true,
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
      <Topbar title="Assignments" subtitle="Manage staff assignments for new courses" />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
        <AdminAssignmentPanel courses={unassignedPage.data} tas={tas} />
        <AssignedCoursesTable page={assignedPage} tas={tas} />
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
