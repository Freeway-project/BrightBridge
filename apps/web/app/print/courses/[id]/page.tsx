import { notFound } from "next/navigation"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { getCourseComments } from "@/lib/services/comments"
import { getCourseInstructor } from "@/lib/services/profiles"
import { searchIssuesAction } from "@/lib/issues/search"
import type { CourseIssue } from "@/lib/issues/types"
import type { ReviewResponse } from "@/lib/services/review"
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  SyllabusGradebookResponseData,
} from "@/lib/workspace/types"
import { PrintToolbar } from "./_components/print-toolbar"
import { CoursePdfDocument } from "./_components/course-pdf-document"

interface Props {
  params: Promise<{ id: string }>
}

// Always render fresh — the export should reflect the latest saved review data.
export const dynamic = "force-dynamic"

export default async function CoursePrintPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const [detail, comments, instructor, issues] = await Promise.all([
    getAdminCourseDetail(id),
    getCourseComments(id),
    getCourseInstructor(id),
    // Empty query returns every issue for the course (no limit).
    searchIssuesAction(id, "").catch(() => [] as CourseIssue[]),
  ])

  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  const byKey: Record<string, ReviewResponse> = {}
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey[key] = r
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PrintToolbar />
      <CoursePdfDocument
        course={course}
        instructorName={instructor?.fullName ?? instructor?.email ?? null}
        meta={byKey["course_metadata"]?.response_data as MetadataResponseData | undefined}
        matrix={byKey["review_matrix"]?.response_data as ReviewMatrixResponseData | undefined}
        syllabus={byKey["syllabus_review"]?.response_data as SyllabusGradebookResponseData | undefined}
        metaStatus={byKey["course_metadata"]?.status ?? null}
        matrixStatus={byKey["review_matrix"]?.status ?? null}
        syllabusStatus={byKey["syllabus_review"]?.status ?? null}
        issues={issues}
        comments={comments}
        generatedAt={new Date().toISOString()}
      />
    </div>
  )
}
