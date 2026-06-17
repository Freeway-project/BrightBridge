import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { fetchReviewProgressForCourses } from "@/lib/courses/service"
import { getCourseRepository, getReviewRepository } from "@/lib/repositories"
import type { AdminCourseRow, AuditEvent, PaginatedResult, StatusCount, StuckCourse, TAWorkload } from "@/lib/repositories/contracts"
import { getReviewResponses, type ReviewResponse } from "@/lib/services/review"
export type { AdminCourseRow } from "@/lib/repositories/contracts"
export type AdminCoursesPage = PaginatedResult<AdminCourseRow>

export type ReadyForInstructorCourse = {
  courseId: string;
  courseTitle: string;
  instructorName: string | null;
  instructorEmail: string;
  instructorProfileId: string;
  moodleUrl: string;
  brightspaceUrl: string;
};

export type AdminCourseDetail = {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export type AdminOverviewData = {
  totalCourses: number
  statusCounts: StatusCount[]
  taWorkload: TAWorkload[]
}

export type AdminStatsData = {
  totalCourses: number
  statusCounts: StatusCount[]
  taWorkload: TAWorkload[]
  stuckCourses: StuckCourse[]
  /** Total rows matching the stuck-courses cutoff; stuckCourses is a top-N slice. */
  stuckCount: number
  auditEvents: AuditEvent[]
}

const STUCK_COURSES_LIST_LIMIT = 50

export type AdminCoursesPageParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: CourseStatus
  statuses?: readonly CourseStatus[]
  taProfileId?: string
  assignedOnly?: boolean
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const rows = await getCourseRepository().listAdminCourses()
  const progressMap = await fetchReviewProgressForCourses(rows.map((row) => row.id))
  return rows.map((row) => ({ ...row, reviewProgress: progressMap.get(row.id) }))
}

export async function getAdminStatsData(): Promise<AdminStatsData> {
  const repository = getCourseRepository()
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const [totalResult, statusResult, workloadResult, stuckResult, stuckCountResult, auditResult] = await Promise.allSettled([
    repository.countCourses(),
    repository.listStatusCounts(),
    repository.listTAWorkload(),
    repository.listStuckCourses(cutoff, STUCK_COURSES_LIST_LIMIT),
    repository.countStuckCourses(cutoff),
    repository.listAuditEvents(200),
  ])
  if (totalResult.status === "rejected") console.error("[getAdminStatsData] countCourses failed:", totalResult.reason)
  if (stuckResult.status === "rejected") console.error("[getAdminStatsData] listStuckCourses failed:", stuckResult.reason)
  if (stuckCountResult.status === "rejected") console.error("[getAdminStatsData] countStuckCourses failed:", stuckCountResult.reason)
  return {
    totalCourses: totalResult.status === "fulfilled" ? totalResult.value : 0,
    statusCounts: statusResult.status === "fulfilled" ? statusResult.value : [],
    taWorkload: workloadResult.status === "fulfilled" ? workloadResult.value : [],
    stuckCourses: stuckResult.status === "fulfilled" ? stuckResult.value : [],
    stuckCount: stuckCountResult.status === "fulfilled" ? stuckCountResult.value : 0,
    auditEvents: auditResult.status === "fulfilled" ? auditResult.value : [],
  }
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const repository = getCourseRepository()
  const [totalResult, statusResult, workloadResult] = await Promise.allSettled([
    repository.countCourses(),
    repository.listStatusCounts(),
    repository.listTAWorkload(),
  ])
  return {
    totalCourses: totalResult.status === "fulfilled" ? totalResult.value : 0,
    statusCounts: statusResult.status === "fulfilled" ? statusResult.value : [],
    taWorkload: workloadResult.status === "fulfilled" ? workloadResult.value : [],
  }
}

export async function getAdminCoursesPage(
  params: AdminCoursesPageParams = {}
): Promise<AdminCoursesPage> {
  const pageResult = await getCourseRepository().listAdminCoursesPage(params.page, params.pageSize, {
    search: params.search,
    status: params.status,
    statuses: params.statuses,
    taProfileId: params.taProfileId,
    assignedOnly: params.assignedOnly,
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

/**
 * Returns all courses in ready_for_instructor status that have an assigned instructor.
 * Courses without an assigned instructor are excluded (no invite target).
 * Pulls moodle_url and brightspace_url from the course_metadata review response.
 */
export async function getReadyForInstructorCourses(): Promise<ReadyForInstructorCourse[]> {
  const { getPostgresPool } = await import("@/lib/postgres/pool");
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    course_id: string;
    title: string;
    instructor_profile_id: string;
    instructor_email: string;
    instructor_name: string | null;
    metadata: Record<string, unknown> | null;
  }>(
    `SELECT
       c.id              AS course_id,
       c.title,
       p.id              AS instructor_profile_id,
       p.email           AS instructor_email,
       p.full_name       AS instructor_name,
       rr.response_data  AS metadata
     FROM courses c
     INNER JOIN course_assignments ca
       ON ca.course_id = c.id AND ca.role = 'instructor'
     INNER JOIN profiles p
       ON p.id = ca.profile_id
     LEFT JOIN review_responses rr
       ON rr.course_id = c.id
       AND rr.section_id = (
         SELECT id FROM review_sections WHERE key = 'course_metadata' LIMIT 1
       )
     WHERE c.status = 'ready_for_instructor'
     ORDER BY c.updated_at DESC`,
  );

  return rows.map((row) => {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    return {
      courseId: row.course_id,
      courseTitle: row.title,
      instructorName: row.instructor_name,
      instructorEmail: row.instructor_email,
      instructorProfileId: row.instructor_profile_id,
      moodleUrl: (metadata.moodle_url as string | undefined) ?? "",
      brightspaceUrl: (metadata.brightspace_url as string | undefined) ?? "",
    };
  });
}
