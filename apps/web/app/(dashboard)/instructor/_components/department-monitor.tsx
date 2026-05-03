"use client"

import { useState, useMemo } from "react"
import { Building2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/courses/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import type { CourseSummary } from "@/lib/courses/service"

interface Props {
  courses: CourseSummary[]
}

export function DepartmentMonitor({ courses }: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return courses
    const q = search.toLowerCase()
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.department?.toLowerCase().includes(q)
    )
  }, [courses, search])

  const withInstructor = courses.filter((c) =>
    ["sent_to_instructor", "instructor_questions"].includes(c.status)
  ).length
  const approved = courses.filter((c) =>
    ["instructor_approved", "final_approved"].includes(c.status)
  ).length
  const inProgress = courses.filter((c) =>
    ["ta_review_in_progress", "submitted_to_admin", "admin_changes_requested", "ready_for_instructor"].includes(c.status)
  ).length

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" />
          Department Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          All courses under your department — read only
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="With Instructor" value={withInstructor} icon="book-open" />
        <StatCard label="In Review" value={inProgress} icon="clock" />
        <StatCard label="Approved" value={approved} icon="check-square" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search department courses..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg text-center p-8">
          <Building2 className="size-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No department courses</p>
          <p className="text-xs text-muted-foreground mt-1">
            No courses are linked to your department yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{course.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[course.department, course.term].filter(Boolean).join(" · ")}
                </p>
              </div>
              <StatusBadge status={course.status} className="ml-4 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
