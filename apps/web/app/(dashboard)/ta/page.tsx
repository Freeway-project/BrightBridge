import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView, type CourseStat } from "@/components/courses/course-list-view";
import { getTab } from "@/lib/courses/tab-utils";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";
import { getIssueCountsForCoursesAction } from "@/lib/issues/actions";
import { requireProfile } from "@/lib/auth/context";
import { GreetingMessage } from "@/components/shared/greeting-message";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();

  const courseIds = courses.map(c => c.id)
  const issueCountsMap = await getIssueCountsForCoursesAction(courseIds)
  const issueCounts = Object.fromEntries(issueCountsMap)

  const todoCount       = courses.filter(c => getTab(c) === "todo").length
  const inProgressCount = courses.filter(c => getTab(c) === "in_progress").length
  const doneCount       = courses.filter(c => getTab(c) === "done").length

  const stats: CourseStat[] = [
    {
      label: "To Do",
      value: todoCount,
      icon: "book-open",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: "clock",
    },
    {
      label: "Done",
      value: doneCount,
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
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Hey, <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">{firstName}</span>.
            </h1>
            <GreetingMessage />
          </div>
        </div>

        <TaRefreshWrapper>
          <CourseListView initialCourses={courses} stats={stats} issueCounts={issueCounts} />
        </TaRefreshWrapper>
      </div>
    </TweakableContent>
  );
}
