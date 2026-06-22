import { Topbar } from "@/components/layout/topbar"
import { COURSE_STATUSES, WORKFLOW_PHASES, type CourseStatus, type PipelineStage } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage, getAdminOverviewData, getReadyForInstructorCourses, getSentToInstructorCourses, type AdminCourseRow } from "@/lib/admin/queries"
import { SendPanel } from "./_components/send-panel"
import { CoursesBoard, type BoardColumn } from "./_components/courses-board"
import { getProfilesByRole } from "@/lib/services/profiles"
import { getOpenEscalations } from "@/lib/services/escalations"
import { AdminAssignmentPanel } from "./_components/admin-assignment-panel"
import { InstructorAssignmentPanel } from "./_components/instructor-assignment-panel"
import { AssignedCoursesTable } from "./_components/assigned-courses-table"
import { AdminTabs } from "./_components/admin-tabs"
import { EscalationsTable } from "./_components/escalations-table"
import { CompletedCoursesTable } from "./_components/completed-courses-table"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { AdminRefreshWrapper } from "./_components/admin-refresh-wrapper"
import { RecentAssignmentsTable } from "./_components/recent-assignments-table"
import { getCourseRepository } from "@/lib/repositories"
import { AdminOverview } from "./_components/admin-overview"
import { ReadOnlyNotice } from "./_components/read-only-notice"
import { InstitutionPanel } from "@/components/super-admin/institution-panel"
import { getSuperAdminData } from "@/lib/super-admin/queries"
import { firstOpenedAtByCourseIds } from "@/lib/instructor-views/queries"

const INSTRUCTOR_PHASE_STATUSES: ReadonlySet<CourseStatus> = new Set([
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
  "final_approved",
])

type SearchParams = Record<string, string | string[] | undefined>

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "admin_viewer", "super_admin"])
  // admin_viewer sees the same dashboard as admin_full but read-only: every
  // mutating control is hidden below, and the server actions already reject the
  // role, so this is defense-in-depth, not the only guard.
  const isReadOnly = context.profile.role === "admin_viewer"

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const page = parsePositiveInt(resolvedSearchParams?.page, 1)
  const pageSize = parsePositiveInt(resolvedSearchParams?.pageSize, 50)
  const search = getSingleParam(resolvedSearchParams?.search)
  const status = parseCourseStatus(getSingleParam(resolvedSearchParams?.status))
  const rawPhase = getSingleParam(resolvedSearchParams?.phase)
  // A single status (chip) wins. Otherwise a phase tab filters by all its
  // statuses — and the default landing view is the Staging phase (the active
  // work, since migration is largely done); `?phase=all` clears the filter.
  const phase: PipelineStage | undefined =
    status || rawPhase === "all" ? undefined : (parsePipelineStage(rawPhase) ?? "staging")
  const phaseStatuses = phase
    ? WORKFLOW_PHASES.find((p) => p.key === phase)?.groups.flatMap((g) => g.statuses)
    : undefined
  const taProfileId = getSingleParam(resolvedSearchParams?.ta)

  const emptyPage = { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }
  const [
    r_courses,
    r_unassigned,
    r_tas,
    r_escalations,
    r_completed,
    r_assignments,
    r_overview,
    r_institution,
    r_ready,
    r_sent,
  ] = await Promise.allSettled([
    getAdminCoursesPage({ page, pageSize, search, status, statuses: phaseStatuses, taProfileId }),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "course_created" }),
    getProfilesByRole("standard_user"),
    getOpenEscalations(),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "final_approved" }),
    getCourseRepository().listRecentAssignments(20),
    getAdminOverviewData(),
    getSuperAdminData(),
    getReadyForInstructorCourses(),
    getSentToInstructorCourses(),
  ])

  const coursesPage = r_courses.status === "fulfilled" ? r_courses.value : emptyPage
  const unassignedPage = r_unassigned.status === "fulfilled" ? r_unassigned.value : emptyPage
  const tas = r_tas.status === "fulfilled" ? r_tas.value : []
  const openEscalations = r_escalations.status === "fulfilled" ? r_escalations.value : []
  const completedPage = r_completed.status === "fulfilled" ? r_completed.value : emptyPage
  const recentAssignments = r_assignments.status === "fulfilled" ? r_assignments.value : []
  const overviewData = r_overview.status === "fulfilled"
    ? r_overview.value
    : { totalCourses: 0, statusCounts: [], taWorkload: [] }
  const institutionData = r_institution.status === "fulfilled"
    ? r_institution.value
    : { users: [], totalCourses: 0, statusCounts: [], stuckCourses: [], taWorkload: [], auditEvents: [], units: [], members: [] }
  const readyForInstructor = r_ready.status === "fulfilled" ? r_ready.value : []
  const sentToInstructor = r_sent.status === "fulfilled" ? r_sent.value : []

  // ---- Workflow board data (All Courses tab) -----------------------------
  // One column per status, derived from the shared WORKFLOW_PHASES so the admin
  // board and the staff list always show identical columns/labels. Counts come
  // from the (cheap) status-count aggregate; cards are a recent slice per status,
  // capped per column — the List view handles full browsing/search.
  const BOARD_COLUMNS: { key: string; label: string; phase: PipelineStage; statuses: CourseStatus[] }[] =
    WORKFLOW_PHASES.flatMap((phase) =>
      phase.groups.map((group) => ({
        key: group.key,
        label: group.label,
        phase: phase.key,
        statuses: group.statuses,
      })),
    )
  const countByStatus = new Map<CourseStatus, number>(overviewData.statusCounts.map((s) => [s.status, s.count]))
  const repo = getCourseRepository()
  const cardStatuses = COURSE_STATUSES.filter((s) => (countByStatus.get(s) ?? 0) > 0)
  const cardResults = await Promise.allSettled(cardStatuses.map((s) => repo.listAdminCoursesPage(1, 15, { status: s })))
  const rowsByStatus = new Map<CourseStatus, AdminCourseRow[]>()
  cardStatuses.forEach((s, i) => {
    const r = cardResults[i]
    rowsByStatus.set(s, r?.status === "fulfilled" ? r.value.data : [])
  })
  // Batched opened-at lookup for the current page rows so the indicator dot in
  // the All Courses list doesn't N+1. We only ask about rows that are in the
  // instructor phase — earlier statuses can never have an open.
  const instructorPhaseIds = coursesPage.data
    .filter((row) => INSTRUCTOR_PHASE_STATUSES.has(row.status))
    .map((row) => row.id)
  const openedAtMap = await firstOpenedAtByCourseIds(instructorPhaseIds)
  const instructorOpenedAt: Record<string, string> = {}
  openedAtMap.forEach((v, k) => { instructorOpenedAt[k] = v })

  const boardColumns: BoardColumn[] = BOARD_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    phase: col.phase,
    count: col.statuses.reduce((n, s) => n + (countByStatus.get(s) ?? 0), 0),
    cards: col.statuses
      .flatMap((s) => rowsByStatus.get(s) ?? [])
      .map((r) => ({
        id: r.id,
        title: r.title,
        sourceCourseId: r.sourceCourseId,
        taName: r.ta?.name ?? null,
        status: r.status,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => toSortableTimestamp(b.updatedAt) - toSortableTimestamp(a.updatedAt))
      .slice(0, 18),
  }))

  return (
    <>
      <Topbar
        title="Admin"
        subtitle={isReadOnly ? "Read-only view — browse courses and progress; editing is disabled" : "Manage courses, assignments, and review progress"}
        role={context.profile.role}
      />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <AdminRefreshWrapper title="Admin Dashboard">
          <AdminTabs
            unassignedCount={unassignedPage.total}
            openEscalationsCount={openEscalations.length}
            overviewPanel={<AdminOverview data={overviewData} />}
            coursesPanel={
              <CoursesBoard
                columns={boardColumns}
                role={context.profile.role}
                tas={tas}
                readOnly={isReadOnly}
                listView={<AssignedCoursesTable page={coursesPage} tas={tas} statusCounts={overviewData.statusCounts} instructorOpenedAt={instructorOpenedAt} readOnly={isReadOnly} />}
              />
            }
            assignPanel={
              isReadOnly ? (
                <ReadOnlyNotice title="Assign TA to Courses" />
              ) : (
                <AdminAssignmentPanel
                  courses={unassignedPage.data.filter(c => c.ta === null)}
                  tas={tas}
                />
              )
            }
            instructorPanel={
              isReadOnly ? (
                <ReadOnlyNotice title="Create & Assign Instructor" />
              ) : (
                <InstructorAssignmentPanel
                  courses={unassignedPage.data}
                />
              )
            }
            escalationsPanel={<EscalationsTable escalations={openEscalations} readOnly={isReadOnly} />}
            institutionPanel={<InstitutionPanel data={institutionData} storageKey="admin-institution" />}
            completedPanel={<CompletedCoursesTable courses={completedPage.data} />}
            assignmentLogsPanel={<RecentAssignmentsTable logs={recentAssignments} />}
            sendPanel={<SendPanel readyCourses={readyForInstructor} sentCourses={sentToInstructor} readOnly={isReadOnly} />}
            readyForInstructorCount={readyForInstructor.length}
          />
        </AdminRefreshWrapper>
      </TweakableContent>
    </>
  )
}

function toSortableTimestamp(value: string | Date): number {
  if (value instanceof Date) {
    return value.getTime()
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
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

function parsePipelineStage(value: string | undefined): PipelineStage | undefined {
  if (!value) {
    return undefined
  }

  return WORKFLOW_PHASES.some((p) => p.key === value) ? (value as PipelineStage) : undefined
}
