import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView } from "@/components/courses/course-list-view";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";
import { getIssueCountsForCoursesAction } from "@/lib/issues/actions";
import { requireProfile } from "@/lib/auth/context";
import { TaDashboardInsights } from "@/components/shared/ta-dashboard-insights";
import { TaDashboardHeader } from "./_components/ta-dashboard-header";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();

  const courseIds = courses.map(c => c.id)
  const issueCountsMap = await getIssueCountsForCoursesAction(courseIds)
  const issueCounts = Object.fromEntries(issueCountsMap)

  const firstName = ctx.profile.fullName?.split(" ")[0] || "there";

  return (
    <TweakableContent className="min-w-0 flex-1 overflow-hidden">
      <div className="relative h-full overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <TaDashboardHeader firstName={firstName} />

        <TaDashboardInsights courses={courses} issueCounts={issueCounts} />

        <TaRefreshWrapper>
          <CourseListView initialCourses={courses} issueCounts={issueCounts} />
        </TaRefreshWrapper>
      </div>
    </TweakableContent>
  );
}
