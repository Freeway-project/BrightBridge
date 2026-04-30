import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { fetchReviewProgressForCourses } from "@/lib/courses/service"
import { getCourseRepository, getReviewRepository } from "@/lib/repositories"
import type { AdminCourseRow, PaginatedResult } from "@/lib/repositories/contracts"
import { getReviewResponses, type ReviewResponse } from "@/lib/services/review"
export type { AdminCourseRow } from "@/lib/repositories/contracts"
export type AdminCoursesPage = PaginatedResult<AdminCourseRow>

export type AdminCourseDetail = {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export type AdminCoursesPageParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: CourseStatus
  taProfileId?: string
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const rows = await getCourseRepository().listAdminCourses()
  const progressMap = await fetchReviewProgressForCourses(rows.map((row) => row.id))
  return rows.map((row) => ({ ...row, reviewProgress: progressMap.get(row.id) }))
}

export async function getAdminCoursesPage(
  params: AdminCoursesPageParams = {}
): Promise<AdminCoursesPage> {
  const pageResult = await getCourseRepository().listAdminCoursesPage(params.page, params.pageSize, {
    search: params.search,
    status: params.status,
    taProfileId: params.taProfileId,
  })
  const progressMap = await fetchReviewProgressForCourses(pageResult.data.map((row) => row.id))

  return {
    ...pageResult,
    data: pageResult.data.map((row) => ({ ...row, reviewProgress: progressMap.get(row.id) })),
  }
}

export async function getAdminCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
  const course = await getCourseRepository().getAdminCourse(courseId)

  if (!course) {
    return null
  }

  const [responses, sectionKeyById, progressMap] = await Promise.all([
    getReviewResponses(courseId),
    getReviewRepository().getSectionKeyById(),
    fetchReviewProgressForCourses([courseId]),
  ])

  return {
    course: { ...course, reviewProgress: progressMap.get(courseId) },
    responses,
    sectionKeyById,
  }
}
