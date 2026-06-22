import type {
  AssistantDateRange,
  BottleneckBreakdownGroupBy,
  ToolTrace,
  UnitComparisonMetric,
} from "./types"
import {
  queryBottleneckBreakdown,
  queryInstructorWaits,
  queryOverviewMetrics,
  queryRecentActivity,
  queryStaffWorkload,
  queryStuckCourses,
  queryUnitComparison,
} from "./queries"

export async function getOverviewMetrics(dateRange: AssistantDateRange): Promise<ToolTrace> {
  return {
    tool: "get_overview_metrics",
    input: { dateRange },
    output: await queryOverviewMetrics(dateRange),
  }
}

export async function listStuckCourses(minDaysStuck: number, limit: number): Promise<ToolTrace> {
  return {
    tool: "list_stuck_courses",
    input: { minDaysStuck, limit: Math.max(1, Math.min(limit, 50)) },
    output: await queryStuckCourses(minDaysStuck, limit),
  }
}

export async function compareUnits(metric: UnitComparisonMetric, limit: number): Promise<ToolTrace> {
  return {
    tool: "compare_units",
    input: { metric, limit: Math.max(1, Math.min(limit, 25)) },
    output: await queryUnitComparison(metric, limit),
  }
}

export async function summarizeRecentActivity(dateRange: AssistantDateRange, limit: number): Promise<ToolTrace> {
  return {
    tool: "summarize_recent_activity",
    input: { dateRange, limit: Math.max(1, Math.min(limit, 100)) },
    output: await queryRecentActivity(dateRange, limit),
  }
}

export async function getBottleneckBreakdown(groupBy: BottleneckBreakdownGroupBy): Promise<ToolTrace> {
  return {
    tool: "get_bottleneck_breakdown",
    input: { groupBy },
    output: await queryBottleneckBreakdown(groupBy),
  }
}

export async function getInstructorWaits(minDaysWaiting: number, limit: number): Promise<ToolTrace> {
  return {
    tool: "get_instructor_waits",
    input: { minDaysWaiting, limit: Math.max(1, Math.min(limit, 50)) },
    output: await queryInstructorWaits(minDaysWaiting, limit),
  }
}

export async function getStaffWorkload(limit: number): Promise<ToolTrace> {
  return {
    tool: "get_staff_workload",
    input: { limit: Math.max(1, Math.min(limit, 50)) },
    output: await queryStaffWorkload(limit),
  }
}
