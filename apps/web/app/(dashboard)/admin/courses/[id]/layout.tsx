import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getEscalationsForCourse } from "@/lib/services/escalations"
import { getDepartments } from "@/lib/courses/service"
import { getCourseComments } from "@/lib/services/comments"
import { getCourseInstructor } from "@/lib/services/profiles"
import { AdminCourseLayoutClient } from "./_components/admin-course-layout-client"

interface Props {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export default async function AdminCourseDetailLayout({ params, children }: Props) {
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

  const { course } = detail

  return (
    <>
      <Topbar
        title="Course Review"
        subtitle={course.sourceCourseId ? `${course.sourceCourseId} — ${course.title}` : course.title}
        backHref="/admin"
      />
      <AdminCourseLayoutClient
        courseId={id}
        course={course}
        escalations={escalations}
        departments={departments}
        comments={comments}
        currentUserId={context.userId}
        instructorName={instructor?.fullName ?? instructor?.email ?? null}
      >
        {children}
      </AdminCourseLayoutClient>
    </>
  )
}
