import type { AdminCourseRow } from "@/lib/admin/queries"
import type { ReviewResponse } from "@/lib/services/review"
import { CourseReviewDetail } from "@/app/(dashboard)/admin/courses/[id]/_components/course-review-detail"

interface Props {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export function InstructorReviewDetail(props: Props) {
  return <CourseReviewDetail {...props} />
}
