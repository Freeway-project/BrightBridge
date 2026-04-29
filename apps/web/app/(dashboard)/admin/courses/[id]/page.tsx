import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getCourseComments } from "@/lib/services/comments"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { AdminCourseSidebar } from "./_components/admin-course-sidebar"
import { CourseChat } from "./_components/course-chat"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin", "super_admin"])

  const [detail, comments] = await Promise.all([
    getAdminCourseDetail(id),
    getCourseComments(id)
  ])
  
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <>
      <Topbar 
        title="Course Review" 
        subtitle={course.sourceCourseId ? `${course.sourceCourseId} — ${course.title}` : course.title} 
      />
      <main className="flex-1 flex overflow-hidden bg-muted/10">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <CourseReviewDetail
              course={course}
              responses={responses}
              sectionKeyById={sectionKeyById}
            />
          </div>
        </div>

        {/* Sidebar Panel */}
        <aside className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col shadow-sm">
          <div className="flex-1 overflow-y-auto">
            <AdminCourseSidebar course={course} />
          </div>
          <div className="h-[400px] border-t border-border flex-shrink-0">
            <CourseChat 
              courseId={course.id} 
              comments={comments} 
              currentUserId={context.profile.id} 
            />
          </div>
        </aside>
      </main>
    </>
  )
}
