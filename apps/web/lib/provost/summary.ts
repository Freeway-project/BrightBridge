import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import type { SuperAdminData } from "@/lib/super-admin/queries"

/**
 * Derived, presentation-ready figures for the Provost executive dashboard.
 * Pure function of SuperAdminData so the math stays out of JSX and is easy to
 * reason about. Phase totals reuse the workflow package's getPhaseBreakdown
 * (already unit-tested there) rather than re-deriving status grouping here.
 */
export type ProvostSummary = {
  totalCourses: number
  completed: number
  completedPct: number
  inProgress: number
  atRisk: number
  instructorStage: number
  collegeCount: number
  /** One-line greeting summary for the welcome banner. */
  headline: string
}

export function buildProvostSummary(
  data: SuperAdminData,
  provostName: string | null,
): ProvostSummary {
  const { totalCourses, statusCounts, stuckCourses, units } = data

  const countByStatus: Partial<Record<CourseStatus, number>> = Object.fromEntries(
    statusCounts.map((s) => [s.status, s.count]),
  )

  const completed = countByStatus["final_approved"] ?? 0
  const completedPct = totalCourses > 0 ? Math.round((completed / totalCourses) * 100) : 0
  const atRisk = stuckCourses.length
  // In progress = everything not yet finally approved.
  const inProgress = Math.max(totalCourses - completed, 0)

  const breakdown = getPhaseBreakdown(countByStatus)
  const instructorStage = breakdown.find((p) => p.key === "instructor")?.total ?? 0

  const collegeCount = units.filter((u) => u.type === "college").length

  const name = provostName?.trim() || "Provost"
  const collegePart = collegeCount > 0 ? ` across ${collegeCount} college${collegeCount === 1 ? "" : "s"}` : ""
  const attentionPart =
    atRisk > 0 ? ` · ${atRisk} need${atRisk === 1 ? "s" : ""} attention` : " · all on track"
  const headline = `Welcome, ${name} — ${totalCourses} course${totalCourses === 1 ? "" : "s"}${collegePart}${attentionPart}`

  return {
    totalCourses,
    completed,
    completedPct,
    inProgress,
    atRisk,
    instructorStage,
    collegeCount,
    headline,
  }
}
