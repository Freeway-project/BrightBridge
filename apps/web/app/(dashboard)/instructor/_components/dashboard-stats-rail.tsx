"use client"

import { StatCard } from "@/components/shared/stat-card"
import type { InstructorCourse, CourseSummary } from "@/lib/courses/service"

interface Props {
  myCourses: InstructorCourse[]
  departmentCourses: CourseSummary[]
  isDeptHead: boolean
}

/**
 * Fixed left rail for the instructor dashboard (shared with dean / dept-head /
 * assistant-dean, who additionally see the Department block). Holds the summary
 * stat cards stacked vertically, freeing the main column for the course lists.
 * Desktop only — on small screens the lists stand on their own.
 */
export function DashboardStatsRail({ myCourses, departmentCourses, isDeptHead }: Props) {
  const pending = myCourses.filter(
    (c) => c.status === "sent_to_instructor" || c.status === "instructor_viewing"
  ).length
  const questions = myCourses.filter((c) => c.status === "instructor_questions").length
  const approved = myCourses.filter(
    (c) => c.status === "instructor_approved" || c.status === "final_approved"
  ).length

  const deptWithInstructor = departmentCourses.filter((c) =>
    ["sent_to_instructor", "instructor_questions"].includes(c.status)
  ).length
  const deptApproved = departmentCourses.filter((c) =>
    ["instructor_approved", "final_approved"].includes(c.status)
  ).length
  const deptInProgress = departmentCourses.filter((c) =>
    ["ta_review_in_progress", "submitted_to_admin", "admin_changes_requested", "waiting_on_admin", "staging_in_progress", "ready_for_instructor"].includes(c.status)
  ).length

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card/40 p-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My Courses
        </h2>
        <StatCard label="Awaiting Review" value={pending} icon="clock" index={0} />
        <StatCard label="Questions" value={questions} icon="alert-triangle" index={1} />
        <StatCard label="Approved" value={approved} icon="check-square" index={2} />
      </div>

      {isDeptHead && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Department
          </h2>
          <StatCard label="With Instructor" value={deptWithInstructor} icon="book-open" index={3} />
          <StatCard label="In Review" value={deptInProgress} icon="clock" index={4} />
          <StatCard label="Approved" value={deptApproved} icon="check-square" index={5} />
        </div>
      )}
    </aside>
  )
}
