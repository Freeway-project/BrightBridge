"use client"

import { useState } from "react"
import { BookOpen, Clock, CheckSquare, AlertTriangle } from "lucide-react"
import { Topbar } from "@/components/layout/topbar"
import { StatCard } from "@/components/shared/stat-card"
import { CourseFilterBar } from "@/components/courses/course-filter-bar"
import { CourseTable } from "@/components/courses/course-table"
import type { CourseRow } from "@/lib/services/courses"

interface TADashboardClientProps {
  courses: CourseRow[]
}

export function TADashboardClient({ courses }: TADashboardClientProps) {
  const [search, setSearch] = useState("")

  const filtered = courses.filter(
    (c) =>
      search.trim() === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.department ?? "").toLowerCase().includes(search.toLowerCase()),
  )

  const stats = {
    assigned: courses.length,
    inProgress: courses.filter((c) => c.status === "ta_review_in_progress").length,
    submitted: courses.filter((c) => c.status === "submitted_to_admin").length,
    changesRequested: courses.filter((c) => c.status === "admin_changes_requested").length,
  }

  return (
    <>
      <Topbar title="My Courses" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Assigned"           value={stats.assigned}         icon={BookOpen} />
          <StatCard label="In Progress"        value={stats.inProgress}       icon={Clock} />
          <StatCard label="Submitted to Admin" value={stats.submitted}        icon={CheckSquare} />
          <StatCard label="Changes Requested"  value={stats.changesRequested} icon={AlertTriangle} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <CourseFilterBar onSearch={setSearch} />
          </div>
          <CourseTable courses={filtered} />
        </div>
      </main>
    </>
  )
}
