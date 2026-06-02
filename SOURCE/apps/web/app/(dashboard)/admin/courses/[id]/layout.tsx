import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getEscalationsForCourse } from "@/lib/services/escalations"
import { getDepartments } from "@/lib/courses/service"
import { getCourseComments } from "@/lib/services/comments"
import { getCourseInstructor } from "@/lib/services/profiles"
import { AdminCourseSidebar } from "./_components/admin-course-sidebar"
import { TweakableContent } from "@/components/shared/tweakable-content"

interface AdminCourseLayoutProps {
  children: ReactNode
  params: Promise<{ id: string }>
}

export default async function AdminCourseLayout({
  children,
  params,
}: AdminCourseLayoutProps) {
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
    <div className="flex flex-1 overflow-hidden">
      <TweakableContent className="flex-1 overflow-hidden flex flex-col">
        {children}
      </TweakableContent>
      <AdminCourseSidebar
        course={course}
        escalations={escalations}
        currentUserId={context.userId}
        departments={departments}
        comments={comments}
        instructorName={instructor?.fullName ?? instructor?.email ?? null}
      />
    </div>
  )
}
