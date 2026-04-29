import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { StatusBadge } from "@/components/courses/status-badge"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { AdminActionBar } from "./_components/admin-action-bar"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin", "super_admin"])

  const detail = await getAdminCourseDetail(id)
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
    <>
      <Topbar title="Course Review" subtitle={course.title} />
      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
        {/* Banner */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex-1 space-y-0.5 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {course.sourceCourseId ? `${course.sourceCourseId} — ` : ""}{course.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {course.term ?? "No term"}{" "}
              {course.ta ? (
                <>
                  · TA:{" "}
                  <span className="font-medium text-foreground">
                    {course.ta.name ?? course.ta.email}
                  </span>
                </>
              ) : (
                "· No TA assigned"
              )}
            </p>
          </div>
          <StatusBadge status={course.status} />
        </div>

        {/* Section detail cards */}
        <CourseReviewDetail
          course={course}
          responses={responses}
          sectionKeyById={sectionKeyById}
        />

        {/* Admin action bar — only when submitted */}
        {course.status === "submitted_to_admin" && (
          <AdminActionBar courseId={course.id} />
        )}
      </main>
    </>
  )
}
