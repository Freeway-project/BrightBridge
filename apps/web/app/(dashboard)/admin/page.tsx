import { Topbar } from "@/components/layout/topbar"
import { COURSE_STATUSES, WORKFLOW_PHASES, type CourseStatus, type PipelineStage } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCoursesPage, getAdminOverviewData, type AdminCourseRow } from "@/lib/admin/queries"
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
import { FeatureAnnouncementToast } from "@/components/shared/feature-announcement-toast"
import { AdminOverview } from "./_components/admin-overview"
import { MigrationPanel } from "./_components/migration-panel"
import { getLatestMigrationReport } from "@/lib/migration/report"
import { InstitutionPanel } from "@/components/super-admin/institution-panel"
import { getSuperAdminData } from "@/lib/super-admin/queries"

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

  const [coursesPage, unassignedPage, tas, openEscalations, completedPage, recentAssignments, overviewData, migrationReport, institutionData] = await Promise.all([
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
    getCourseRepository().listRecentAssignments(20),
    getAdminOverviewData(),
    getLatestMigrationReport(),
    getSuperAdminData(),
  ])

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
  const cardPages = await Promise.all(cardStatuses.map((s) => repo.listAdminCoursesPage(1, 15, { status: s })))
  const rowsByStatus = new Map<CourseStatus, AdminCourseRow[]>()
  cardStatuses.forEach((s, i) => rowsByStatus.set(s, cardPages[i].data))
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
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 18),
  }))

  return (
    <>
      <FeatureAnnouncementToast role={context.profile.role} />
      <Topbar title="Admin" subtitle="Manage courses, assignments, and review progress" role={context.profile.role} />
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
                listView={<AssignedCoursesTable page={coursesPage} tas={tas} />}
              />
            }
            assignPanel={
              <AdminAssignmentPanel
                courses={unassignedPage.data.filter(c => c.ta === null)}
                tas={tas}
              />
            }
            instructorPanel={
              <InstructorAssignmentPanel
                courses={unassignedPage.data}
              />
            }
            escalationsPanel={<EscalationsTable escalations={openEscalations} />}
            migrationPanel={<MigrationPanel report={migrationReport} />}
            institutionPanel={<InstitutionPanel data={institutionData} storageKey="admin-institution" />}
            completedPanel={<CompletedCoursesTable courses={completedPage.data} />}
            assignmentLogsPanel={<RecentAssignmentsTable logs={recentAssignments} />}
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
