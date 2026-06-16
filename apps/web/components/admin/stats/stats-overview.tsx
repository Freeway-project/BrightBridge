"use client"

import type { PhaseBreakdown } from "@coursebridge/workflow"
import { StatCard } from "@/components/shared/stat-card"

interface Props {
  totalCourses: number
  phases: PhaseBreakdown[]
}

export function StatsOverview({ totalCourses, phases }: Props) {
  const phaseTotal = (key: PhaseBreakdown["key"]) =>
    phases.find((p) => p.key === key)?.total ?? 0

  const statusTotal = (status: string) =>
    phases.flatMap((phase) => phase.statuses).find((entry) => entry.status === status)?.count ?? 0

  const migrationBacklog = phaseTotal("migration")
  const withInstructor = phaseTotal("instructor")
  const readyForInstructor = statusTotal("ready_for_instructor")
  const waitingOnAdmin = statusTotal("waiting_on_admin")

  const pct = (n: number) =>
    totalCourses > 0 ? `${Math.round((n / totalCourses) * 100)}% of total` : "0% of total"

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      <StatCard
        label="Total Inventory"
        value={totalCourses}
        icon="book-open"
        index={0}
        sub="all migrated courses in CourseBridge"
      />
      <StatCard
        label="Ready For Instructor"
        value={readyForInstructor}
        icon="user-check"
        index={1}
        accent="#2563eb"
        sub={readyForInstructor > 0 ? `${pct(readyForInstructor)} awaiting handoff` : "nothing queued for handoff"}
      />
      <StatCard
        label="Waiting On Admin"
        value={waitingOnAdmin}
        icon="clock"
        index={2}
        accent="#f59e0b"
        sub={waitingOnAdmin > 0 ? `${pct(waitingOnAdmin)} needs admin action` : "no admin queue right now"}
      />
      <StatCard
        label="With Instructor"
        value={withInstructor}
        icon="check-square"
        index={3}
        accent="#d97706"
        sub={withInstructor > 0 ? `${pct(withInstructor)} in instructor review` : "none currently with instructors"}
      />
      <StatCard
        label="Migration Leftovers"
        value={migrationBacklog}
        icon="alert-triangle"
        index={4}
        accent="#64748b"
        sub={migrationBacklog > 0 ? "small upstream tail; lower priority" : "migration phase effectively cleared"}
      />
    </div>
  )
}
