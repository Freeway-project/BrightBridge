"use client"

import { StatCard } from "@/components/shared/stat-card"
import type { StatusCount, TAWorkload, StuckCourse } from "@/lib/repositories/contracts"

interface Props {
  totalCourses: number
  statusCounts: StatusCount[]
  taWorkload: TAWorkload[]
  stuckCourses: StuckCourse[]
}

export function StatsOverview({ totalCourses, statusCounts, taWorkload, stuckCourses }: Props) {
  const completedCount = statusCounts.find((s) => s.status === "final_approved")?.count ?? 0
  const completedPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0
  const activeStaff = taWorkload.filter((ta) => ta.active_courses > 0).length

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Courses" value={totalCourses} icon="book-open" index={0} />
      <StatCard label={`Completed (${completedPct}%)`} value={completedCount} icon="check-square" index={1} />
      <StatCard label="Stuck Courses" value={stuckCourses.length} icon="alert-triangle" index={2} />
      <StatCard label="Active TAs" value={activeStaff} icon="clock" index={3} />
    </div>
  )
}
