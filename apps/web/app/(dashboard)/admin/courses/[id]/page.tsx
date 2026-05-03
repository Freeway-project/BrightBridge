import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getEscalationsForCourse } from "@/lib/services/escalations"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { AdminCourseSidebar } from "./_components/admin-course-sidebar"
import { TweakProvider } from "@/components/shared/tweak-provider"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [detail, escalations] = await Promise.all([
    getAdminCourseDetail(id),
    getEscalationsForCourse(id),
  ])
  
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <TweakProvider>
      <Topbar 
        title="Course Review" 
        subtitle={course.sourceCourseId ? `${course.sourceCourseId} — ${course.title}` : course.title} 
        backHref="/admin"
      />
      <main className="flex-1 flex overflow-hidden bg-muted/10">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-[var(--card-spacing,1.5rem)]">
            <CourseReviewDetail
              course={course}
              responses={responses}
              sectionKeyById={sectionKeyById}
            />
          </div>
        </div>

        {/* Sidebar Panel */}
        <aside className="w-80 flex-shrink-0 border-l border-border bg-card overflow-y-auto shadow-sm">
          <AdminCourseSidebar course={course} escalations={escalations} currentUserId={context.userId} />
        </aside>
      </main>
    </TweakProvider>
  )
}
