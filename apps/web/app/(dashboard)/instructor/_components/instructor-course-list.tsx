"use client"

import { useState, useMemo } from "react"
import { GraduationCap, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/courses/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import type { InstructorCourse } from "@/lib/courses/service"

interface Props {
  courses: InstructorCourse[]
}

export function InstructorCourseList({ courses }: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return courses
    const q = search.toLowerCase()
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.department?.toLowerCase().includes(q)
    )
  }, [courses, search])

  const pending = courses.filter((c) => c.status === "sent_to_instructor").length
  const questions = courses.filter((c) => c.status === "instructor_questions").length
  const approved = courses.filter((c) =>
    c.status === "instructor_approved" || c.status === "final_approved"
  ).length

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">My Courses</h2>
          <p className="text-sm text-muted-foreground">Courses sent to you for review</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Awaiting Review" value={pending} icon="clock" />
        <StatCard label="Questions" value={questions} icon="alert-triangle" />
        <StatCard label="Approved" value={approved} icon="check-square" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg text-center p-8">
          <GraduationCap className="size-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No courses found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {courses.length === 0
              ? "No courses have been sent to you yet."
              : "Try adjusting your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
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
