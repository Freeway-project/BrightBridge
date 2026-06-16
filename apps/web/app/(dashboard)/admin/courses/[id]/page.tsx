import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getCourseComments } from "@/lib/services/comments"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StickyTabs } from "@/components/ui/sticky-tabs"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { CourseChat } from "./_components/course-chat"
import { IssueTracker } from "../../../courses/[id]/_components/issues/issue-tracker"
import { CourseDetailRefreshWrapper } from "./_components/course-detail-refresh-wrapper"
import { ResendInviteBanner, SendToInstructorBanner } from "./_components/send-to-instructor-banner"
import { FinalSummaryEditor } from "@/components/shared/final-summary-editor"
import { StagingShellBanner } from "./_components/staging-shell-banner"
import { ResubmitBanner } from "./_components/resubmit-banner"
import { QuestionRoundBanner } from "./_components/question-round-banner"
import { FinalApprovalBanner } from "./_components/final-approval-banner"
import { getSubmissionHistory, getQuestionRoundHistory } from "@/lib/courses/service"
import { getCourseTimeline } from "@/lib/courses/timeline"
import { CourseTimeline } from "@/components/courses/course-timeline"
import { viewForCourse } from "@/lib/instructor-views/queries"
import { OpenedDot } from "@/components/instructor/opened-dot"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [detail, comments, submissionHistory, questionRounds, timeline, instructorView] = await Promise.all([
    getAdminCourseDetail(id),
    getCourseComments(id),
    getSubmissionHistory(id),
    getQuestionRoundHistory(id),
    getCourseTimeline(id, { includeInternalComments: true }),
    viewForCourse(id),
  ])

  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <>
      <Topbar 
        title="Course Review" 
        subtitle={course.sourceCourseId ? `${course.sourceCourseId} — ${course.title}` : course.title} 
        backHref="/admin"
      />
      <main className="flex-1 flex overflow-hidden bg-background">
        <StickyTabs storageKey={`admin-course-${id}`} defaultValue="review" className="flex-1 flex flex-col overflow-hidden w-full">
          <TabsList variant="line" className="border-b border-border px-6 pt-4 bg-background">
            <TabsTrigger value="review" className="text-base">Review</TabsTrigger>
            <TabsTrigger value="issues" className="text-base">Issues</TabsTrigger>
            <TabsTrigger value="chat" className="text-base">Discussion</TabsTrigger>
            <TabsTrigger value="timeline" className="text-base">Timeline</TabsTrigger>
          </TabsList>

          {/* Review Tab */}
          <TabsContent value="review" className="flex-1 overflow-y-auto p-6">
            <CourseDetailRefreshWrapper
              courseId={id}
              title="Course Review"
            >
              <div className="space-y-[var(--card-spacing,1.5rem)]">
                {(course.status === "sent_to_instructor" ||
                  course.status === "instructor_viewing" ||
                  course.status === "instructor_questions" ||
                  course.status === "instructor_approved" ||
                  course.status === "final_approved") && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <OpenedDot openedAt={instructorView?.firstOpenedAt ?? null} />
                    {instructorView
                      ? `Instructor opened the dashboard · ${new Date(instructorView.lastOpenedAt).toLocaleString()}`
                      : "Instructor hasn't opened the dashboard yet"}
                  </p>
                )}
                {course.status === "waiting_on_admin" && (
                  <StagingShellBanner courseId={id} />
                )}
                {course.status === "ready_for_instructor" && (
                  <SendToInstructorBanner courseId={id} />
                )}
                {(course.status === "sent_to_instructor" || course.status === "instructor_viewing") && (
                  <ResendInviteBanner courseId={id} />
                )}
                {course.status === "submitted_to_admin" && (
                  <ResubmitBanner submissions={submissionHistory} />
                )}
                {course.status === "instructor_questions" && (
                  <>
                    <QuestionRoundBanner rounds={questionRounds} />
                    <SendToInstructorBanner courseId={id} variant="resend" />
                  </>
                )}
                {course.status === "instructor_approved" && (
                  <FinalApprovalBanner courseId={id} />
                )}
                <CourseReviewDetail
                  course={course}
                  responses={responses}
                  sectionKeyById={sectionKeyById}
                />
              </div>
            </CourseDetailRefreshWrapper>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-6 h-full">
              <FinalSummaryEditor courseId={id} initialNotes={course.instructorSummaryNotes} editable={false} />
              <div className="bg-card border border-border rounded-lg p-6 flex-1 overflow-y-auto">
                <IssueTracker
                  courseId={id}
                  phases={["migration", "staging", "provision"]}
                  createPhase="migration"
                  title="Issues & Questions"
                  userRole={context.profile.role}
                />
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 overflow-hidden p-6">
            <div className="bg-card border border-border rounded-lg h-full overflow-hidden flex flex-col">
              <CourseChat
                courseId={id}
                comments={comments}
                currentUserId={context.userId}
              />
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 overflow-hidden p-6">
            <CourseTimeline items={timeline} />
          </TabsContent>

        </StickyTabs>
      </main>
    </>
  )
}
