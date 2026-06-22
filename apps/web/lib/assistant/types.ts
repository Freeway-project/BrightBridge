import type { Role, CourseStatus } from "@coursebridge/workflow"

export type AssistantRole = "user" | "assistant"

export type AssistantMessage = {
  role: AssistantRole
  content: string
}

export type AssistantScope = {
  kind: "institution"
  allowedRoles: Role[]
}

export type AssistantDateRange =
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "all_time"

export type AssistantToolName =
  | "get_overview_metrics"
  | "list_stuck_courses"
  | "compare_units"
  | "summarize_recent_activity"
  | "get_bottleneck_breakdown"
  | "get_instructor_waits"
  | "get_staff_workload"

export type OverviewMetricsResult = {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  stuckCourses: number
  instructorWaitingCourses: number
  completionRate: number
  windowLabel: string
}

export type StuckCourseResult = {
  id: string
  title: string
  status: CourseStatus
  daysStuck: number
  updatedAt: string
  orgUnitName: string | null
  term: string | null
}

export type UnitComparisonMetric =
  | "total_courses"
  | "completion_rate"
  | "stuck_courses"
  | "instructor_waiting_courses"
  | "median_days_open"

export type UnitComparisonRow = {
  orgUnitId: string | null
  orgUnitName: string
  totalCourses: number
  completedCourses: number
  completionRate: number
  stuckCourses: number
  instructorWaitingCourses: number
  medianDaysOpen: number
  metricValue: number
}

export type RecentActivityRow = {
  id: string
  courseId: string
  courseTitle: string
  actorName: string | null
  actorRole: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
}

export type RecentActivityResult = {
  windowLabel: string
  totalEvents: number
  transitionCounts: Array<{ label: string; count: number }>
  events: RecentActivityRow[]
}

export type BottleneckBreakdownGroupBy = "status" | "phase" | "org_unit" | "blocking_role"

export type BottleneckBreakdownRow = {
  key: string
  label: string
  totalCourses: number
  stuckCourses: number
  medianDaysOpen: number
}

export type InstructorWaitRow = {
  courseId: string
  courseTitle: string
  status: CourseStatus
  instructorName: string | null
  instructorEmail: string | null
  updatedAt: string
  daysWaiting: number
  orgUnitName: string | null
}

export type StaffWorkloadRow = {
  id: string
  fullName: string | null
  email: string
  activeCourses: number
  needsFixes: number
}

export type ToolTrace =
  | { tool: "get_overview_metrics"; input: { dateRange: AssistantDateRange }; output: OverviewMetricsResult }
  | { tool: "list_stuck_courses"; input: { minDaysStuck: number; limit: number }; output: StuckCourseResult[] }
  | { tool: "compare_units"; input: { metric: UnitComparisonMetric; limit: number }; output: UnitComparisonRow[] }
  | { tool: "summarize_recent_activity"; input: { dateRange: AssistantDateRange; limit: number }; output: RecentActivityResult }
  | { tool: "get_bottleneck_breakdown"; input: { groupBy: BottleneckBreakdownGroupBy }; output: BottleneckBreakdownRow[] }
  | { tool: "get_instructor_waits"; input: { minDaysWaiting: number; limit: number }; output: InstructorWaitRow[] }
  | { tool: "get_staff_workload"; input: { limit: number }; output: StaffWorkloadRow[] }

export type AssistantResponse = {
  answer: string
  toolTrace: ToolTrace[]
  generatedAt: string
  model: string
}
