import { StatCard } from "@/components/shared/stat-card"
import type { ProvostSummary } from "@/lib/provost/summary"

/**
 * The hero KPI row for the Provost executive dashboard. Reuses the animated
 * StatCard; at-risk turns red when > 0 to draw the eye, otherwise green.
 */
export function ProvostKpiRow({ summary }: { summary: ProvostSummary }) {
  const atRiskAccent = summary.atRisk > 0 ? "#ef4444" : "#10b981"

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Total Courses"
        value={summary.totalCourses}
        icon="book-open"
        index={0}
      />
      <StatCard
        label="Completed"
        value={summary.completed}
        icon="check-square"
        sub={`${summary.completedPct}% of total`}
        index={1}
      />
      <StatCard
        label="In Progress"
        value={summary.inProgress}
        icon="clock"
        index={2}
      />
      <StatCard
        label="Stuck / At-Risk"
        value={summary.atRisk}
        icon="alert-triangle"
        accent={atRiskAccent}
        sub={summary.atRisk > 0 ? "needs attention" : "all on track"}
        index={3}
      />
      <StatCard
        label="Instructor Stage"
        value={summary.instructorStage}
        icon="book-open"
        accent="#8b5cf6"
        index={4}
      />
    </div>
  )
}
