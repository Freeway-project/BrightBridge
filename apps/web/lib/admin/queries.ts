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
};

export type SentToInstructorCourse = {
  courseId: string;
  courseTitle: string;
  status: CourseStatus;
  instructorName: string | null;
  instructorEmail: string | null;
  updatedAt: string;
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
  }>(
    `SELECT
       c.id              AS course_id,
       c.title,
       p.id              AS instructor_profile_id,
       p.email           AS instructor_email,
       p.full_name       AS instructor_name
     FROM courses c
     INNER JOIN course_assignments ca
       ON ca.course_id = c.id AND ca.role = 'instructor'
     INNER JOIN profiles p
       ON p.id = ca.profile_id
     WHERE c.status = 'ready_for_instructor'
     ORDER BY c.updated_at DESC`,
  );

  return rows.map((row) => ({
    courseId: row.course_id,
    courseTitle: row.title,
    instructorName: row.instructor_name,
    instructorEmail: row.instructor_email,
    instructorProfileId: row.instructor_profile_id,
  }));
}

const INSTRUCTOR_PHASE_STATUSES = [
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
] as const;

/** Courses currently in any instructor-review phase, newest first. */
export async function getSentToInstructorCourses(): Promise<SentToInstructorCourse[]> {
  const { getPostgresPool } = await import("@/lib/postgres/pool");
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    course_id: string;
    title: string;
    status: string;
    updated_at: string;
    instructor_email: string | null;
    instructor_name: string | null;
  }>(
    `SELECT
       c.id          AS course_id,
       c.title,
       c.status,
       c.updated_at,
       p.email       AS instructor_email,
       p.full_name   AS instructor_name
     FROM courses c
     LEFT JOIN course_assignments ca
       ON ca.course_id = c.id AND ca.role = 'instructor'
     LEFT JOIN profiles p
       ON p.id = ca.profile_id
     WHERE c.status = ANY($1::text[])
     ORDER BY c.updated_at DESC`,
    [INSTRUCTOR_PHASE_STATUSES],
  );

  return rows.map((r) => ({
    courseId: r.course_id,
    courseTitle: r.title,
    status: r.status as CourseStatus,
    instructorName: r.instructor_name,
    instructorEmail: r.instructor_email,
    updatedAt: r.updated_at,
  }));
}
