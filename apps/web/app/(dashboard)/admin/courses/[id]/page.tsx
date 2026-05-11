import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getEscalationsForCourse } from "@/lib/services/escalations"
import { getDepartments } from "@/lib/courses/service"
import { getCourseComments } from "@/lib/services/comments"
import { getCourseInstructor } from "@/lib/services/profiles"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { AdminCourseSidebar } from "./_components/admin-course-sidebar"
import { CourseChat } from "./_components/course-chat"
import { IssueTracker } from "../../../courses/[id]/_components/issues/issue-tracker"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { CourseDetailRefreshWrapper } from "./_components/course-detail-refresh-wrapper"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [detail, escalations, departments, comments, instructor] = await Promise.all([
    getAdminCourseDetail(id),
    getEscalationsForCourse(id),
    getDepartments(),
    getCourseComments(id),
    getCourseInstructor(id),
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
      <main className="flex-1 flex overflow-hidden bg-muted/10">
        {/* Tabs Container */}
        <TweakableContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="review" className="flex-1 flex flex-col overflow-hidden">
            <TabsList variant="line" className="border-b border-border px-6 pt-4">
              <TabsTrigger value="review">Review</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            {/* Review Tab */}
            <TabsContent value="review" className="flex-1 overflow-y-auto p-6">
              <CourseDetailRefreshWrapper
                courseId={id}
                title="Course Review"
              >
                <div className="space-y-[var(--card-spacing,1.5rem)]">
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
              <div className="space-y-[var(--card-spacing,1.5rem)]">
                <IssueTracker
                  courseId={id}
                  phase="migration"
                  userRole={context.profile.role}
                />
              </div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 overflow-hidden">
              <CourseChat
                courseId={id}
                comments={comments}
                currentUserId={context.userId}
              />
            </TabsContent>
          </Tabs>
        </TweakableContent>

        {/* Sidebar Panel */}
        <aside className="flex-shrink-0 flex overflow-hidden">
          <AdminCourseSidebar
            course={course}
            escalations={escalations}
            currentUserId={context.userId}
            departments={departments}
            comments={comments}
            instructorName={instructor?.fullName ?? instructor?.email ?? null}
          />
        </aside>
      </main>
    </>
  )
}
