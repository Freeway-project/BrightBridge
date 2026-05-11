import { getAdminCourseDetail } from "@/lib/admin/queries"
import { requireProfile } from "@/lib/auth/context"
import { notFound } from "next/navigation"
import { CourseReviewDetail } from "./_components/course-review-detail"
import { CourseDetailRefreshWrapper } from "./_components/course-detail-refresh-wrapper"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { id } = await params
  await requireProfile()

  const detail = await getAdminCourseDetail(id)

  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  return (
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
  )
}
