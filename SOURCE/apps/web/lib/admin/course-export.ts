import "server-only"

import { getAdminCourseDetail, type AdminCourseRow } from "./queries"
import { getCourseComments, type CourseComment } from "@/lib/services/comments"
import { getCourseInstructor } from "@/lib/services/profiles"
import { searchIssuesAction } from "@/lib/issues/search"
import type { CourseIssue } from "@/lib/issues/types"
import type { ReviewResponse } from "@/lib/services/review"
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  SyllabusGradebookResponseData,
} from "@/lib/workspace/types"

export type SectionStatus = "draft" | "submitted" | null

/**
 * Fully-assembled course review data shared by the PDF print page and the
 * Excel export route, so both surfaces stay in sync and never drop a section.
 */
export type CourseExportData = {
  course: AdminCourseRow
  instructorName: string | null
  meta?: MetadataResponseData
  matrix?: ReviewMatrixResponseData
  syllabus?: SyllabusGradebookResponseData
  metaStatus: SectionStatus
  matrixStatus: SectionStatus
  syllabusStatus: SectionStatus
  issues: CourseIssue[]
  comments: CourseComment[]
}

export async function getCourseExportData(courseId: string): Promise<CourseExportData | null> {
  const [detail, comments, instructor, issues] = await Promise.all([
    getAdminCourseDetail(courseId),
    getCourseComments(courseId),
    getCourseInstructor(courseId),
    // Empty query returns every issue for the course (no limit).
    searchIssuesAction(courseId, "").catch(() => [] as CourseIssue[]),
  ])

  if (!detail) return null

  const { course, responses, sectionKeyById } = detail

  const byKey: Record<string, ReviewResponse> = {}
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey[key] = r
  }

  return {
    course,
    instructorName: instructor?.fullName ?? instructor?.email ?? null,
    meta: byKey["course_metadata"]?.response_data as MetadataResponseData | undefined,
    matrix: byKey["review_matrix"]?.response_data as ReviewMatrixResponseData | undefined,
    syllabus: byKey["syllabus_review"]?.response_data as SyllabusGradebookResponseData | undefined,
    metaStatus: byKey["course_metadata"]?.status ?? null,
    matrixStatus: byKey["review_matrix"]?.status ?? null,
    syllabusStatus: byKey["syllabus_review"]?.status ?? null,
    issues,
    comments,
  }
}
