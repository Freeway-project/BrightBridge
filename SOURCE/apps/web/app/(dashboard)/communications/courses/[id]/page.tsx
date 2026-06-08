import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StickyTabs } from "@/components/ui/sticky-tabs"
import { CourseReviewDetail } from "@/app/(dashboard)/admin/courses/[id]/_components/course-review-detail"
import { IssueTracker } from "@/app/(dashboard)/courses/[id]/_components/issues/issue-tracker"
import { FinalSummaryEditor } from "@/components/shared/final-summary-editor"
import { ResendInviteBanner, SendToInstructorBanner } from "@/app/(dashboard)/admin/courses/[id]/_components/send-to-instructor-banner"
import { QuestionRoundBanner } from "@/app/(dashboard)/admin/courses/[id]/_components/question-round-banner"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { getSharedComments } from "@/lib/services/comments"
import { getQuestionRoundHistory } from "@/lib/courses/service"
import { lastForCourse } from "@/lib/instructor-emails/queries"
import { viewForCourse } from "@/lib/instructor-views/queries"
import { OpenedDot } from "@/components/instructor/opened-dot"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CommsCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_viewer", "admin_full", "super_admin"])

  const [detail, sharedComments, questionRounds, lastEmail, instructorView] = await Promise.all([
    getAdminCourseDetail(id),
    getSharedComments(id),
    getQuestionRoundHistory(id),
    lastForCourse(id),
    viewForCourse(id),
  ])
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail
  const lastSendFailed = lastEmail?.status === "failed"
  const lastSendError = lastEmail?.sendError ?? null

  return (
    <>
      <Topbar
        title="Course Handoff"
        subtitle={course.sourceCourseId ? `${course.sourceCourseId} — ${course.title}` : course.title}
        backHref="/communications"
        role={context.profile.role}
      />
      <main className="flex-1 flex overflow-hidden bg-background">
        <StickyTabs storageKey={`comms-course-${id}`} defaultValue="review" className="flex-1 flex flex-col overflow-hidden w-full">
          <TabsList variant="line" className="border-b border-border px-6 pt-4 bg-background">
            <TabsTrigger value="review" className="text-base">Review</TabsTrigger>
            <TabsTrigger value="issues" className="text-base">Issues</TabsTrigger>
            <TabsTrigger value="discussion" className="text-base">Discussion</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="flex-1 overflow-y-auto p-6">
            <div className="space-y-[var(--card-spacing,1.5rem)]">
              {(course.status === "sent_to_instructor" ||
                course.status === "instructor_viewing" ||
                course.status === "instructor_questions" ||
                course.status === "instructor_approved" ||
                course.status === "final_approved") && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <OpenedDot openedAt={instructorView?.firstOpenedAt ?? null} />
                  {instructorView
                    ? `Instructor opened the dashboard · last seen ${new Date(instructorView.lastOpenedAt).toLocaleString()}`
                    : "Instructor hasn't opened the dashboard yet"}
                </p>
              )}
              {course.status === "ready_for_instructor" && (
                <SendToInstructorBanner courseId={id} />
              )}
              {(course.status === "sent_to_instructor" || course.status === "instructor_viewing") && (
                <ResendInviteBanner
                  courseId={id}
                  lastSendFailed={lastSendFailed}
                  lastSendError={lastSendError}
                />
              )}
              {course.status === "instructor_questions" && (
                <>
                  <QuestionRoundBanner rounds={questionRounds} />
                  <SendToInstructorBanner courseId={id} variant="resend" />
                </>
              )}
              <CourseReviewDetail
                course={course}
                responses={responses}
                sectionKeyById={sectionKeyById}
              />
            </div>
          </TabsContent>

          <TabsContent value="issues" className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-6">
              <FinalSummaryEditor courseId={id} initialNotes={course.instructorSummaryNotes} editable={false} />
              <div className="bg-card border border-border rounded-lg p-6 flex-1 overflow-y-auto">
                <IssueTracker
                  courseId={id}
                  phase="migration"
                  userRole={context.profile.role}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discussion" className="flex-1 overflow-hidden p-6">
            <CourseDiscussion
              courseId={id}
              comments={sharedComments}
              currentUserId={context.userId}
            />
          </TabsContent>
        </StickyTabs>
      </main>
    </>
  )
}
