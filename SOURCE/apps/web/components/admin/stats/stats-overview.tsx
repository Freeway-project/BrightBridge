"use client"

import type { PhaseBreakdown } from "@coursebridge/workflow"
import { StatCard } from "@/components/shared/stat-card"

interface Props {
  totalCourses: number
  phases: PhaseBreakdown[]
}

/**
 * Four plain-English KPIs for admin/provost readers — derived from the
 * canonical phase breakdown so they always sum back to totalCourses.
 *
 *   Imported            = totalCourses
 *   Awaiting review     = migration + staging phase totals
 *   With instructor     = instructor phase total
 *   Live in Brightspace = provision phase total
 */
export function StatsOverview({ totalCourses, phases }: Props) {
  const phaseTotal = (key: PhaseBreakdown["key"]) =>
    phases.find((p) => p.key === key)?.total ?? 0

  const awaitingReview = phaseTotal("migration") + phaseTotal("staging")
  const withInstructor = phaseTotal("instructor")
  const live = phaseTotal("provision")

  const pct = (n: number) =>
    totalCourses > 0 ? `${Math.max(1, Math.round((n / totalCourses) * 100))}% of total` : "—"

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Imported"
        value={totalCourses}
        icon="book-open"
        index={0}
        sub="courses migrated from Moodle"
      />
      <StatCard
        label="Awaiting review"
        value={awaitingReview}
        icon="clock"
        index={1}
        sub={awaitingReview > 0 ? pct(awaitingReview) : "nothing in queue"}
      />
      <StatCard
        label="With instructor"
        value={withInstructor}
        icon="user-check"
        index={2}
        sub={withInstructor > 0 ? "instructor action needed" : "none in instructor stage"}
      />
      <StatCard
        label="Live in Brightspace"
        value={live}
        icon="check-square"
        index={3}
        sub={live > 0 ? `${pct(live)} provisioned` : "no courses provisioned yet"}
      />
    </div>
  )
}
