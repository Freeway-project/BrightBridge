import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchReviewProgressForCourses, type ReviewProgress } from "@/lib/courses/service"
import { getReviewResponses, type ReviewResponse } from "@/lib/services/review"

function getAdmin() {
  const client = createAdminClient()
  if (!client) throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.")
  return client
}

export type AdminCourseRow = {
  id: string
  sourceCourseId: string | null
  targetCourseId: string | null
  title: string
  term: string | null
  department: string | null
  status: CourseStatus
  updatedAt: string
  ta: { id: string; name: string | null; email: string } | null
  reviewProgress?: ReviewProgress
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const admin = getAdmin()

  const { data, error } = await admin
    .from("courses")
    .select(`
      id, source_course_id, target_course_id, title, term, department, status, updated_at,
      course_assignments (
        role,
        profiles!course_assignments_profile_id_fkey ( id, full_name, email )
      )
    `)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(`getAdminCourses: ${error.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: AdminCourseRow[] = (data ?? []).map((row: any) => {
    const assignments: any[] = row.course_assignments ?? []
    const taAssignment = assignments.find((a) => a.role === "ta")
    return {
      id: row.id,
      sourceCourseId: row.source_course_id,
      targetCourseId: row.target_course_id,
      title: row.title,
      term: row.term,
      department: row.department,
      status: row.status as CourseStatus,
      updatedAt: row.updated_at,
      ta: taAssignment?.profiles
        ? {
            id: taAssignment.profiles.id,
            name: taAssignment.profiles.full_name,
            email: taAssignment.profiles.email,
          }
        : null,
    }
  })

  const progressMap = await fetchReviewProgressForCourses(rows.map((r) => r.id))
  return rows.map((r) => ({ ...r, reviewProgress: progressMap.get(r.id) }))
}

export type AdminCourseDetail = {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export async function getAdminCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
  const admin = getAdmin()

  const { data, error } = await admin
    .from("courses")
    .select(`
      id, source_course_id, target_course_id, title, term, department, status, updated_at,
      course_assignments (
        role,
        profiles!course_assignments_profile_id_fkey ( id, full_name, email )
      )
    `)
    .eq("id", courseId)
    .single()

  if (error) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = data
  const assignments: any[] = row.course_assignments ?? []
  const taAssignment = assignments.find((a) => a.role === "ta")

  const progressMap = await fetchReviewProgressForCourses([courseId])
  const course: AdminCourseRow = {
    id: row.id,
    sourceCourseId: row.source_course_id,
    targetCourseId: row.target_course_id,
    title: row.title,
    term: row.term,
    department: row.department,
    status: row.status as CourseStatus,
    updatedAt: row.updated_at,
    ta: taAssignment?.profiles
      ? {
          id: taAssignment.profiles.id,
          name: taAssignment.profiles.full_name,
          email: taAssignment.profiles.email,
        }
      : null,
    reviewProgress: progressMap.get(courseId),
  }

  const responses = await getReviewResponses(courseId)

  // Fetch section keys so components can look up responses by section key
  const { data: sections } = await admin
    .from("review_sections")
    .select("id, key")

  const sectionKeyById: Record<string, string> = {}
  for (const s of sections ?? []) {
    sectionKeyById[s.id] = s.key
  }

  return { course, responses, sectionKeyById }
}
