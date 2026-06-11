import { Topbar } from "@/components/layout/topbar"
import { getInstructorDashboardData } from "@/lib/courses/service"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { InstructorInbox } from "./_components/instructor-inbox"
import type { CourseStatus } from "@coursebridge/workflow"

// Department courses that have actually reached the instructor stage — the ones
// a leader can act on. Keeps the leadership lane focused on instructor decisions
// rather than the whole pre-instructor pipeline.
const INSTRUCTOR_STAGE: ReadonlySet<CourseStatus> = new Set<CourseStatus>([
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
  "final_approved",
])

export default async function InstructorDashboardPage() {
  const { myCourses, departmentCourses, isDeptHead } = await getInstructorDashboardData()

  const deptDecisionCourses = isDeptHead
    ? departmentCourses.filter((c) => INSTRUCTOR_STAGE.has(c.status))
    : []

  return (
    <>
      <Topbar title="My Course Reviews" />
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-10">
          <InstructorInbox
            courses={myCourses}
            heading="Needs your review"
            subheading="Courses sent to you — review and approve, or ask the team a question."
            emptyHint="When a course is ready for you, it'll show up here."
            actionVerb="Review & approve"
          />

          {isDeptHead && (
            <InstructorInbox
              courses={deptDecisionCourses}
              heading="Your department"
              subheading="Instructor decisions across your department — you can act on any of these on the instructor's behalf."
              emptyHint="No courses in your department are waiting on an instructor right now."
              actionVerb="Open & act"
            />
          )}
        </div>
      </TweakableContent>
    </>
  )
}
