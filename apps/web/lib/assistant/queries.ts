import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { getAdminCourses, getSentToInstructorCourses } from "@/lib/admin/queries"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import type { AdminCourseRow, OrgUnit } from "@/lib/repositories/contracts"
import type {
  AssistantDateRange,
  BottleneckBreakdownGroupBy,
  BottleneckBreakdownRow,
  InstructorWaitRow,
  OverviewMetricsResult,
  RecentActivityResult,
  StaffWorkloadRow,
  StuckCourseResult,
  UnitComparisonMetric,
  UnitComparisonRow,
} from "./types"

const COMPLETED_STATUSES = new Set<CourseStatus>(["final_approved"])
const INSTRUCTOR_WAITING_STATUSES = new Set<CourseStatus>([
  "ready_for_instructor",
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
])

const PHASE_LABELS: Array<{ statuses: readonly CourseStatus[]; label: string }> = [
  {
    label: "migration",
    statuses: [
      "course_created",
      "assigned_to_ta",
      "ta_review_in_progress",
      "submitted_to_admin",
      "admin_changes_requested",
    ],
  },
  {
    label: "handoff",
    statuses: ["ready_for_instructor"],
  },
  {
    label: "instructor",
    statuses: ["sent_to_instructor", "instructor_viewing", "instructor_questions", "instructor_approved"],
  },
  {
    label: "complete",
    statuses: ["final_approved"],
  },
]

type DateWindow = {
  start: Date | null
  end: Date
  label: string
}

type CourseWithUnit = AdminCourseRow & { orgUnitName: string | null }

function getDateWindow(dateRange: AssistantDateRange): DateWindow {
  const now = new Date()
  switch (dateRange) {
    case "last_7_days":
      return { start: new Date(now.getTime() - 7 * 86_400_000), end: now, label: "last 7 days" }
    case "last_30_days":
      return { start: new Date(now.getTime() - 30 * 86_400_000), end: now, label: "last 30 days" }
    case "this_month":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: now, label: "this month" }
    case "last_month":
      return {
        start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
        end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        label: "last month",
      }
    case "all_time":
      return { start: null, end: now, label: "all time" }
  }
}

function inWindow(iso: string, window: DateWindow) {
  const value = new Date(iso).getTime()
  if (Number.isNaN(value)) return false
  const lower = window.start ? value >= window.start.getTime() : true
  const upper = value <= window.end.getTime()
  return lower && upper
}

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

function derivePhase(status: CourseStatus): string {
  return PHASE_LABELS.find((entry) => entry.statuses.includes(status))?.label ?? "other"
}

async function getCoursesWithUnits(): Promise<{ courses: CourseWithUnit[]; units: OrgUnit[] }> {
  const [courses, units] = await Promise.all([getAdminCourses(), getHierarchyRepository().listUnits()])
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]))
  return {
    courses: courses.map((course) => ({
      ...course,
      orgUnitName: course.orgUnitId ? unitNameById.get(course.orgUnitId) ?? null : course.department ?? null,
    })),
    units,
  }
}

export async function queryOverviewMetrics(dateRange: AssistantDateRange): Promise<OverviewMetricsResult> {
  const { courses } = await getCoursesWithUnits()
  const window = getDateWindow(dateRange)
  const scoped = dateRange === "all_time" ? courses : courses.filter((course) => inWindow(course.updatedAt, window))
  const totalCourses = scoped.length
  const completedCourses = scoped.filter((course) => COMPLETED_STATUSES.has(course.status)).length
  const inProgressCourses = scoped.filter((course) => !COMPLETED_STATUSES.has(course.status)).length
  const stuckCourses = scoped.filter((course) => !COMPLETED_STATUSES.has(course.status) && daysSince(course.updatedAt) >= 5).length
  const instructorWaitingCourses = scoped.filter((course) => INSTRUCTOR_WAITING_STATUSES.has(course.status)).length

  return {
    totalCourses,
    completedCourses,
    inProgressCourses,
    stuckCourses,
    instructorWaitingCourses,
    completionRate: totalCourses === 0 ? 0 : Math.round((completedCourses / totalCourses) * 1000) / 10,
    windowLabel: window.label,
  }
}

export async function queryStuckCourses(minDaysStuck: number, limit: number): Promise<StuckCourseResult[]> {
  const { courses } = await getCoursesWithUnits()
  return courses
    .filter((course) => !COMPLETED_STATUSES.has(course.status))
    .map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      daysStuck: daysSince(course.updatedAt),
      updatedAt: course.updatedAt,
      orgUnitName: course.orgUnitName,
      term: course.term,
    }))
    .filter((course) => course.daysStuck >= minDaysStuck)
    .sort((a, b) => b.daysStuck - a.daysStuck || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, Math.min(limit, 50)))
}

export async function queryUnitComparison(metric: UnitComparisonMetric, limit: number): Promise<UnitComparisonRow[]> {
  const { courses } = await getCoursesWithUnits()
  const byUnit = new Map<string, UnitComparisonRow>()

  for (const course of courses) {
    const key = course.orgUnitId ?? `department:${course.department ?? "unassigned"}`
    const label = course.orgUnitName ?? course.department ?? "Unassigned"
    const existing = byUnit.get(key) ?? {
      orgUnitId: course.orgUnitId ?? null,
      orgUnitName: label,
      totalCourses: 0,
      completedCourses: 0,
      completionRate: 0,
      stuckCourses: 0,
      instructorWaitingCourses: 0,
      medianDaysOpen: 0,
      metricValue: 0,
    }

    existing.totalCourses += 1
    if (COMPLETED_STATUSES.has(course.status)) existing.completedCourses += 1
    if (!COMPLETED_STATUSES.has(course.status) && daysSince(course.updatedAt) >= 5) existing.stuckCourses += 1
    if (INSTRUCTOR_WAITING_STATUSES.has(course.status)) existing.instructorWaitingCourses += 1

    const values = (existing as UnitComparisonRow & { __daysOpen?: number[] }).__daysOpen ?? []
    values.push(daysSince(course.updatedAt))
    ;(existing as UnitComparisonRow & { __daysOpen?: number[] }).__daysOpen = values

    byUnit.set(key, existing)
  }

  const rows = [...byUnit.values()].map((row) => {
    const daysOpen = ((row as UnitComparisonRow & { __daysOpen?: number[] }).__daysOpen ?? []).filter(Number.isFinite)
    row.completionRate = row.totalCourses === 0 ? 0 : Math.round((row.completedCourses / row.totalCourses) * 1000) / 10
    row.medianDaysOpen = median(daysOpen)
    row.metricValue =
      metric === "total_courses"
        ? row.totalCourses
        : metric === "completion_rate"
          ? row.completionRate
          : metric === "stuck_courses"
            ? row.stuckCourses
            : metric === "instructor_waiting_courses"
              ? row.instructorWaitingCourses
              : row.medianDaysOpen
    delete (row as UnitComparisonRow & { __daysOpen?: number[] }).__daysOpen
    return row
  })

  return rows
    .sort((a, b) => b.metricValue - a.metricValue || a.orgUnitName.localeCompare(b.orgUnitName))
    .slice(0, Math.max(1, Math.min(limit, 25)))
}

export async function queryRecentActivity(dateRange: AssistantDateRange, limit: number): Promise<RecentActivityResult> {
  const repository = getCourseRepository()
  const window = getDateWindow(dateRange)
  const events = (await repository.listAuditEvents(Math.max(limit * 3, 150)))
    .filter((event) => inWindow(event.created_at, window))
    .slice(0, Math.max(1, Math.min(limit, 100)))

  const byTransition = new Map<string, number>()
  for (const event of events) {
    const key = `${event.from_status ?? "start"} -> ${event.to_status}`
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1)
  }

  return {
    windowLabel: window.label,
    totalEvents: events.length,
    transitionCounts: [...byTransition.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    events: events.map((event) => ({
      id: event.id,
      courseId: event.course_id,
      courseTitle: event.course_title,
      actorName: event.actor_name,
      actorRole: event.actor_role,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
      createdAt: event.created_at,
    })),
  }
}

function groupLabel(groupBy: BottleneckBreakdownGroupBy, course: CourseWithUnit): string {
  switch (groupBy) {
    case "status":
      return course.status
    case "phase":
      return derivePhase(course.status)
    case "org_unit":
      return course.orgUnitName ?? "Unassigned"
    case "blocking_role":
      return INSTRUCTOR_WAITING_STATUSES.has(course.status) ? "instructor" : "internal team"
  }
}

export async function queryBottleneckBreakdown(groupBy: BottleneckBreakdownGroupBy): Promise<BottleneckBreakdownRow[]> {
  const { courses } = await getCoursesWithUnits()
  const groups = new Map<string, { row: BottleneckBreakdownRow; ages: number[] }>()

  for (const course of courses.filter((entry) => !COMPLETED_STATUSES.has(entry.status))) {
    const label = groupLabel(groupBy, course)
    const existing = groups.get(label) ?? {
      row: { key: label, label, totalCourses: 0, stuckCourses: 0, medianDaysOpen: 0 },
      ages: [],
    }
    existing.row.totalCourses += 1
    const age = daysSince(course.updatedAt)
    existing.ages.push(age)
    if (age >= 5) existing.row.stuckCourses += 1
    groups.set(label, existing)
  }

  return [...groups.values()]
    .map(({ row, ages }) => ({ ...row, medianDaysOpen: median(ages) }))
    .sort((a, b) => b.stuckCourses - a.stuckCourses || b.totalCourses - a.totalCourses)
    .slice(0, 12)
}

export async function queryInstructorWaits(minDaysWaiting: number, limit: number): Promise<InstructorWaitRow[]> {
  const [courses, sentToInstructor] = await Promise.all([getCoursesWithUnits(), getSentToInstructorCourses()])
  const courseById = new Map(courses.courses.map((course) => [course.id, course]))

  return sentToInstructor
    .map((row) => {
      const course = courseById.get(row.courseId)
      return {
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        status: row.status,
        instructorName: row.instructorName,
        instructorEmail: row.instructorEmail,
        updatedAt: row.updatedAt,
        daysWaiting: daysSince(row.updatedAt),
        orgUnitName: course?.orgUnitName ?? null,
      }
    })
    .filter((row) => row.daysWaiting >= minDaysWaiting)
    .sort((a, b) => b.daysWaiting - a.daysWaiting || a.courseTitle.localeCompare(b.courseTitle))
    .slice(0, Math.max(1, Math.min(limit, 50)))
}

export async function queryStaffWorkload(limit: number): Promise<StaffWorkloadRow[]> {
  const rows = await getCourseRepository().listTAWorkload()
  return rows
    .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      activeCourses: row.active_courses,
      needsFixes: row.needs_fixes,
    }))
    .sort((a, b) => b.activeCourses - a.activeCourses || b.needsFixes - a.needsFixes || (a.fullName ?? "").localeCompare(b.fullName ?? ""))
    .slice(0, Math.max(1, Math.min(limit, 50)))
}
