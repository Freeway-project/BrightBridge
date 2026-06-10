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
  const inProgressCount = statusCounts
    .filter((s) => !["course_created", "final_approved"].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Courses" value={totalCourses} icon="book-open" index={0} sub="across all stages" />
      <StatCard label={`Completed`} value={completedCount} icon="check-square" index={1} sub={`${completedPct}% of total`} />
      <StatCard label="In Progress" value={inProgressCount} icon="clock" index={2} sub="active in pipeline" />
      <StatCard label="Stuck" value={stuckCourses.length} icon="alert-triangle" index={3} sub="needs attention" />
    </div>
  )
}
