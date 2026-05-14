import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView, type CourseStat } from "@/components/courses/course-list-view";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";
import { getIssueCountsForCoursesAction } from "@/lib/issues/actions";
import { requireProfile } from "@/lib/auth/context";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();

  const courseIds = courses.map(c => c.id)
  const issueCountsMap = await getIssueCountsForCoursesAction(courseIds)
  const issueCounts = Object.fromEntries(issueCountsMap)

  const stats: CourseStat[] = [
    {
      label: "Assigned",
      value: courses.length,
      icon: "book-open",
    },
    {
      label: "In Progress",
      value: courses.filter(c => c.status === "ta_review_in_progress").length,
      icon: "clock",
    },
    {
      label: "Submitted",
      value: courses.filter(c => c.status === "submitted_to_admin").length,
      icon: "check-square",
    },
    {
      label: "Issues",
      value: Object.values(issueCounts).reduce((acc, curr) => acc + curr.open, 0),
      icon: "alert-triangle",
    },
  ];

  const firstName = ctx.profile.fullName?.split(" ")[0] || "there";

  return (
    <TweakableContent className="min-w-0 flex-1 overflow-hidden">
      <div className="relative h-full overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Hey, <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">{firstName}</span>.
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Review Dashboard <span className="mx-2 opacity-30">—</span> {courses.length} courses total
            </p>
          </div>
        </div>

        <TaRefreshWrapper>
          <CourseListView initialCourses={courses} stats={stats} issueCounts={issueCounts} />
        </TaRefreshWrapper>
      </div>
    </TweakableContent>
  );
}
