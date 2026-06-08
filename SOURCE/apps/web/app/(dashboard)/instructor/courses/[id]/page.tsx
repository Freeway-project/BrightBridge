import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getCourseRepository } from "@/lib/repositories"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IssueTracker } from "@/app/(dashboard)/courses/[id]/_components/issues/issue-tracker"
import { InstructorCourseActions } from "./_components/instructor-course-actions"
import { InstructorReviewDetail } from "./_components/instructor-review-detail"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { getSharedComments } from "@/lib/services/comments"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InstructorCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()

  if (context.profile.role !== "instructor" && context.profile.role !== "super_admin") {
    notFound()
  }

  // Verify instructor is assigned to this course
  const assignedCourse = await getCourseRepository().getAssignedCourseById(id, context.profile.id, "instructor")
  if (!assignedCourse) notFound()

  const [detail, sharedComments] = await Promise.all([
    getAdminCourseDetail(id),
    getSharedComments(id),
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
      />
      <main className="flex-1 flex overflow-hidden bg-background">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="border-b border-border px-6 pt-4 bg-background flex items-center justify-between">
            <TabsList variant="line">
              <TabsTrigger value="overview" className="text-base">Overview</TabsTrigger>
              <TabsTrigger value="review" className="text-base">Review</TabsTrigger>
              <TabsTrigger value="questions" className="text-base">Questions</TabsTrigger>
              <TabsTrigger value="discussion" className="text-base">Discussion</TabsTrigger>
            </TabsList>
            <InstructorCourseActions courseId={id} status={course.status} />
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
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
