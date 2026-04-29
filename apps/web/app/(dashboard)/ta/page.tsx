"use client"

import { useState } from "react"
import { BookOpen, Clock, CheckSquare, AlertTriangle, Plus } from "lucide-react"
import { Topbar } from "@/components/layout/topbar"
import { StatCard } from "@/components/shared/stat-card"
import { CourseFilterBar } from "@/components/courses/course-filter-bar"
import { CourseTable } from "@/components/courses/course-table"
import { Button } from "@/components/ui/button"
import { MOCK_COURSES } from "@/lib/mock/courses"

// TODO: Replace MOCK_COURSES with real Supabase query once RLS policies are added.
// Query: SELECT * FROM courses JOIN course_assignments ON ... WHERE ta_id = user.id

export default function TADashboardPage() {
  const [search, setSearch] = useState("")

  const filtered = MOCK_COURSES.filter((c) =>
    search.trim() === "" ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    assigned:         MOCK_COURSES.length,
    inProgress:       MOCK_COURSES.filter((c) => c.status === "ta_review_in_progress").length,
    submitted:        MOCK_COURSES.filter((c) => c.status === "submitted_to_admin").length,
    changesRequested: MOCK_COURSES.filter((c) => c.status === "admin_changes_requested").length,
  }

  return (
    <>
      <Topbar
        title="My Courses"
        subtitle="Fall 2025"
        actions={
          <Button size="sm">
            <Plus className="size-3.5" />
            New Review
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Assigned"           value={stats.assigned}         icon={BookOpen} />
          <StatCard label="TA In Progress"     value={stats.inProgress}       icon={Clock} />
          <StatCard label="Submitted to Admin" value={stats.submitted}        icon={CheckSquare} />
          <StatCard label="Changes Requested"  value={stats.changesRequested} icon={AlertTriangle} />
        </div>

        {/* Filter bar + table */}
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
