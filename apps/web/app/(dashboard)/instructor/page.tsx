import { Topbar } from "@/components/layout/topbar"
import { getInstructorDashboardData } from "@/lib/courses/service"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { InstructorInbox } from "./_components/instructor-inbox"

export default async function InstructorDashboardPage() {
  const { myCourses, departmentCourses, isDeptHead } = await getInstructorDashboardData()

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
            <>
              <hr className="border-border/40" />
              <InstructorInbox
                courses={departmentCourses}
                heading="Your department"
                subheading="All courses in your division — act on instructor reviews or track pipeline progress."
                emptyHint="No courses in your department are currently waiting for instructor action."
                actionVerb="Open & act"
              />
            </>
          )}
        </div>
      </TweakableContent>
    </>
  )
}
