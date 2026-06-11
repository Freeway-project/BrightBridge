import { notFound } from "next/navigation"
import { Eye } from "lucide-react"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { resolveDelegationContext } from "@/lib/courses/service"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StickyTabs } from "@/components/ui/sticky-tabs"
import { IssueTracker } from "@/app/(dashboard)/courses/[id]/_components/issues/issue-tracker"
import { InstructorCourseActions } from "./_components/instructor-course-actions"
import { CourseSwitcher } from "./_components/course-switcher"
import { CourseSwitchSidebar } from "./_components/course-switch-sidebar"
import { InstructorReviewDetail } from "./_components/instructor-review-detail"
import { InstructorCourseShell } from "./_components/instructor-course-shell"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { getSharedComments } from "@/lib/services/comments"
import { getCourseTimeline } from "@/lib/courses/timeline"
import { CourseTimeline } from "@/components/courses/course-timeline"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InstructorCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()

  if (context.profile.role !== "instructor" && context.profile.role !== "super_admin") {
    notFound()
  }

  // Assigned instructors get the full workspace. Org-hierarchy leaders (dean /
  // dept-head / etc.) may ACT on the assigned instructor's behalf — approve, ask,
  // talk to the TA — for any course in their subtree. Super admins keep a
  // read-only hierarchy view.
  const assignedCourse = await getCourseRepository().getAssignedCourseById(id, context.profile.id, "instructor")
  const delegation = assignedCourse
    ? null
    : await resolveDelegationContext({ courseId: id, profile: context.profile })
  const canActViaDelegation = delegation?.delegated ?? false
  const canViewViaHierarchy =
    !assignedCourse &&
    (context.profile.role === "super_admin" ||
      canActViaDelegation ||
      (await getHierarchyRepository().hasHierarchyAccess(context.profile.id, id)))
  if (!assignedCourse && !canViewViaHierarchy) notFound()

  // Read-only unless you're the assigned instructor OR a leader acting on their
  // behalf. (Super-admin hierarchy views stay read-only.)
  const readOnly = !assignedCourse && !canActViaDelegation

  const [detail, sharedComments, timeline, myCourses] = await Promise.all([
    getAdminCourseDetail(id),
    getSharedComments(id),
    getCourseTimeline(id, { includeInternalComments: false }),
    getCourseRepository().listInstructorCourses(context.profile.id),
  ])
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <>
      <Topbar
        title={course.title}
        subtitle={course.sourceCourseId ?? undefined}
        backHref="/instructor"
        role={context.profile.role}
        actions={
          <CourseSwitcher
            currentId={id}
            courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status }))}
            className="md:hidden"
          />
        }
      />
      <main className="flex-1 flex overflow-hidden bg-background">
        <CourseSwitchSidebar
          currentId={id}
          courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status, term: c.term }))}
        />
        <InstructorCourseShell
          courseId={id}
          status={course.status}
          finalSummary={course.instructorSummaryNotes}
          readOnly={readOnly}
          actingOnBehalfOfName={canActViaDelegation ? (delegation?.onBehalfOfName ?? null) : null}
          actingAsTitle={canActViaDelegation ? (delegation?.leaderTitle ?? null) : null}
          reviewNode={
            <InstructorReviewDetail
              course={course}
              responses={responses}
              sectionKeyById={sectionKeyById}
            />
          }
          full={
        <StickyTabs storageKey={`instructor-course-${id}`} defaultValue="overview" className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="border-b border-border px-6 pt-4 bg-background flex items-center justify-between">
            <TabsList variant="line">
              <TabsTrigger value="overview" className="text-base">Overview</TabsTrigger>
              <TabsTrigger value="review" className="text-base">Review</TabsTrigger>
              <TabsTrigger value="questions" className="text-base">Questions</TabsTrigger>
              <TabsTrigger value="discussion" className="text-base">Discussion</TabsTrigger>
              <TabsTrigger value="timeline" className="text-base">Timeline</TabsTrigger>
            </TabsList>
            {readOnly ? (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Eye className="size-3.5" aria-hidden />
                Department view — read only
              </span>
            ) : (
              <InstructorCourseActions courseId={id} status={course.status} finalSummary={course.instructorSummaryNotes} />
            )}
          </div>

          {/* Overview — clean course info only */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Course Details</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {course.term && (
                    <>
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-medium">{course.term}</span>
                    </>
                  )}
                  {course.department && (
                    <>
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{course.department}</span>
                    </>
                  )}
                  {course.sourceCourseId && (
                    <>
                      <span className="text-muted-foreground">Source ID</span>
                      <span className="font-mono text-xs">{course.sourceCourseId}</span>
                    </>
                  )}
                  {course.targetCourseId && (
                    <>
                      <span className="text-muted-foreground">Brightspace ID</span>
                      <span className="font-mono text-xs">{course.targetCourseId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Review — read-only TA form results */}
          <TabsContent value="review" className="flex-1 overflow-y-auto p-6">
            <InstructorReviewDetail
              course={course}
              responses={responses}
              sectionKeyById={sectionKeyById}
            />
          </TabsContent>

          {/* Questions — instructor-phase issues only */}
          <TabsContent value="questions" className="flex-1 overflow-y-auto p-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <IssueTracker
                courseId={id}
                phase="provision"
                userRole={context.profile.role}
              />
            </div>
          </TabsContent>

          {/* Discussion — shared thread visible to instructor, TA, and admin */}
          <TabsContent value="discussion" className="flex-1 overflow-hidden p-6">
            <CourseDiscussion
              courseId={id}
              comments={sharedComments}
              currentUserId={context.userId}
              canPost={!readOnly}
            />
          </TabsContent>

          {/* Timeline — full course history (internal comments hidden) */}
          <TabsContent value="timeline" className="flex-1 overflow-hidden p-6">
            <CourseTimeline items={timeline} />
          </TabsContent>
        </StickyTabs>
          }
        />
      </main>
    </>
  )
}
