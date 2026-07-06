import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView } from "@/components/courses/course-list-view";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";
import { getIssueCountsForCoursesAction } from "@/lib/issues/actions";
import { requireProfile } from "@/lib/auth/context";
import { TaDashboardInsights } from "@/components/shared/ta-dashboard-insights";
import { TaDashboardHeader } from "./_components/ta-dashboard-header";
import { ScrollCollapsibleHeader } from "./_components/scroll-collapsible-header";
import { TodayCard } from "./_components/today-card";
import { ChatNudgeCard } from "./_components/chat-nudge-card";
import { PipelineStrip } from "./_components/pipeline-strip";
import { bucketTaPipeline, countOwnedByTa, selectTodayCourses } from "@/lib/courses/ta-pipeline";
import { listConversationsForUser } from "@/lib/chat/queries";
import { TaDashboardShell } from "./_components/ta-dashboard-shell";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();

  const courseIds = courses.map((c) => c.id);
  const [issueCountsMap, initialConversations] = await Promise.all([
    getIssueCountsForCoursesAction(courseIds),
    listConversationsForUser(ctx.userId),
  ]);
  const issueCounts = Object.fromEntries(issueCountsMap);

  const firstName = ctx.profile.fullName?.split(" ")[0] || "there";
  const today = selectTodayCourses(courses);
  const totalOwned = countOwnedByTa(courses);
  const buckets = bucketTaPipeline(courses);

  const subtitle =
    totalOwned === 0
      ? "Nothing urgent for you right now."
      : `You have ${totalOwned} course${totalOwned === 1 ? "" : "s"} waiting on you today.`;

  return (
    <TaDashboardShell
      userId={ctx.userId}
      initialConversations={initialConversations}
      coursesContent={(
        <div id="ta-dashboard-scroll" className="relative h-full overflow-y-auto overflow-x-hidden p-6 sm:p-8">
          <ScrollCollapsibleHeader>
            <TaDashboardHeader firstName={firstName} subtitle={subtitle} />

            <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="space-y-4">
                {today.length > 0 && (
                  <TodayCard courses={today} totalWaiting={totalOwned} />
                )}
                <ChatNudgeCard conversations={initialConversations} />
              </div>
              <div className="min-w-[280px] space-y-2">
                <PipelineStrip counts={buckets} />
              </div>
            </div>

            <details className="mb-5 group/details">
              <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  Show breakdown
                  <span className="transition-transform group-open/details:rotate-90">›</span>
                </span>
              </summary>
              <div className="mt-3">
                <TaDashboardInsights courses={courses} issueCounts={issueCounts} />
              </div>
            </details>
          </ScrollCollapsibleHeader>

          <TaRefreshWrapper>
            <div id="course-list" className="scroll-mt-4">
              <CourseListView
                initialCourses={courses}
                issueCounts={issueCounts}
                canExport={ctx.profile.role === "admin_full" || ctx.profile.role === "super_admin"}
                scrollable={false}
              />
            </div>
          </TaRefreshWrapper>
        </div>
      )}
    />
  )
}
