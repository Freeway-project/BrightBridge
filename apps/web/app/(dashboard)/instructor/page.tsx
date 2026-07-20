import { Topbar } from "@/components/layout/topbar"
import { getInstructorDashboardData } from "@/lib/courses/service"
import { overdueUnvisited } from "@/lib/instructor-reminders/pending"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { InstructorInbox } from "./_components/instructor-inbox"
import { InstructorDashboardTabs } from "./_components/instructor-dashboard-tabs"
import { OverdueReminderBanner } from "./_components/overdue-reminder-banner"
import { PendingCourseCards } from "./_components/pending-course-cards"

export default async function InstructorDashboardPage() {
  const { myCourses, departmentCourses, isLeader, pendingCourses } =
    await getInstructorDashboardData()

  return (
    <>
      <Topbar title="My Course Reviews" />
      <TweakableContent className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-10">
          <OverdueReminderBanner courses={overdueUnvisited(pendingCourses)} />
          <PendingCourseCards courses={pendingCourses} />
          {isLeader ? (
            <InstructorDashboardTabs myCourses={myCourses} departmentCourses={departmentCourses} />
          ) : (
            <InstructorInbox
              courses={myCourses}
              heading="Needs your review"
              subheading="Courses sent to you — review and approve, or ask the team a question."
              emptyHint="When a course is ready for you, it'll show up here."
              actionVerb="Review & approve"
            />
          )}
        </div>
      </TweakableContent>
    </>
  )
}
