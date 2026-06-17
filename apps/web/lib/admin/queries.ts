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
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return []; // Supabase env vars not configured — tab shows empty state

  // Step 1: fetch courses with status ready_for_instructor that have an instructor assignment
  const { data: courseData, error: courseError } = await admin
    .from("courses")
    .select(`
      id,
      title,
      course_assignments!inner(
        profile_id,
        profiles!profile_id(email, full_name)
      )
    `)
    .eq("status", "ready_for_instructor")
    .eq("course_assignments.role", "instructor")
    .order("updated_at", { ascending: false });

  if (courseError) {
    console.error("[getReadyForInstructorCourses] courses query failed:", courseError.message);
    return [];
  }

  if (!courseData || courseData.length === 0) return [];

  const courseIds = courseData.map((c: any) => c.id);

  // Step 2: fetch course_metadata review responses for these courses in one query
  const { data: responseData, error: responseError } = await admin
    .from("review_responses")
    .select("course_id, response_data, review_sections!inner(key)")
    .in("course_id", courseIds)
    .eq("review_sections.key", "course_metadata");

  if (responseError) {
    console.error("[getReadyForInstructorCourses] metadata query failed:", responseError.message);
    return [];
  }

  const metadataByCourseid = new Map<string, Record<string, unknown>>();
  for (const row of (responseData ?? []) as any[]) {
    metadataByCourseid.set(row.course_id, row.response_data ?? {});
  }

  return (courseData as any[]).flatMap((row) => {
    // course_assignments!inner returns an array; take the first instructor
    const assignments = Array.isArray(row.course_assignments)
      ? row.course_assignments
      : [row.course_assignments];
    const assignment = assignments[0];
    if (!assignment) return [];

    const profiles = Array.isArray(assignment.profiles)
      ? assignment.profiles
      : [assignment.profiles];
    const profile = profiles[0];
    if (!profile?.email) return [];

    const metadata = metadataByCourseid.get(row.id) ?? {};

    return [{
      courseId: row.id as string,
      courseTitle: row.title as string,
      instructorName: (profile.full_name as string | null) ?? null,
      instructorEmail: profile.email as string,
      instructorProfileId: assignment.profile_id as string,
      moodleUrl: (metadata.moodle_url as string | undefined) ?? "",
      brightspaceUrl: (metadata.brightspace_url as string | undefined) ?? "",
    }];
  });
}
