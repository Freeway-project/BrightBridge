import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CourseStatus, Role } from "@coursebridge/workflow"

function getAdmin() {
  const client = createAdminClient()
  if (!client) throw new Error("Admin client unavailable — SUPABASE_SERVICE_ROLE_KEY not set")
  return client
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CourseRow = {
  id: string
  title: string
  status: CourseStatus
  term: string | null
  department: string | null
  created_at: string
  updated_at: string
  ta: { name: string | null; email: string } | null
  instructor: { name: string | null; email: string } | null
}

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
}

export type StatusCount = {
  status: CourseStatus
  count: number
}

export type StuckCourse = {
  id: string
  title: string
  status: CourseStatus
  days_stuck: number
  updated_at: string
}

export type TAWorkload = {
  id: string
  full_name: string | null
  email: string
  active_courses: number
  needs_fixes: number
}

export type AuditEvent = {
  id: string
  course_id: string
  course_title: string
  from_status: string | null
  to_status: string
  actor_name: string | null
  actor_email: string
  actor_role: string
  note: string | null
  created_at: string
}

export type SuperAdminData = {
  courses: CourseRow[]
  users: UserRow[]
  statusCounts: StatusCount[]
  stuckCourses: StuckCourse[]
  taWorkload: TAWorkload[]
  auditEvents: AuditEvent[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function fetchCourses(admin: ReturnType<typeof createAdminClient>): Promise<CourseRow[]> {
  const { data, error } = await admin!
    .from("courses")
    .select(`
      id, title, status, term, department, created_at, updated_at,
      course_assignments (
        role,
        profiles!course_assignments_profile_id_fkey ( full_name, email )
      )
    `)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(`courses: ${error.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const assignments: any[] = row.course_assignments ?? []
    const ta = assignments.find((a) => a.role === "ta")
    const instructor = assignments.find((a) => a.role === "instructor")
    return {
      id: row.id,
      title: row.title,
      status: row.status as CourseStatus,
      term: row.term,
      department: row.department,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ta: ta?.profiles ? { name: ta.profiles.full_name, email: ta.profiles.email } : null,
      instructor: instructor?.profiles
        ? { name: instructor.profiles.full_name, email: instructor.profiles.email }
        : null,
    }
  })
}

async function fetchUsers(admin: ReturnType<typeof createAdminClient>): Promise<UserRow[]> {
  const { data, error } = await admin!
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("role", { ascending: true })

  if (error) throw new Error(`profiles: ${error.message}`)
  return (data ?? []) as UserRow[]
}

async function fetchStatusCounts(admin: ReturnType<typeof createAdminClient>): Promise<StatusCount[]> {
  const { data, error } = await admin!
    .from("courses")
    .select("status")

  if (error) throw new Error(`status counts: ${error.message}`)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return Object.entries(counts).map(([status, count]) => ({
    status: status as CourseStatus,
    count,
  }))
}

async function fetchStuckCourses(admin: ReturnType<typeof createAdminClient>): Promise<StuckCourse[]> {
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin!
    .from("courses")
    .select("id, title, status, updated_at")
    .neq("status", "final_approved")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })

  if (error) throw new Error(`stuck courses: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as CourseStatus,
    days_stuck: Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86_400_000),
    updated_at: row.updated_at,
  }))
}

async function fetchTAWorkload(admin: ReturnType<typeof createAdminClient>): Promise<TAWorkload[]> {
  const { data: tas, error: tasError } = await admin!
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "ta")

  if (tasError) throw new Error(`ta list: ${tasError.message}`)

  const { data: assignments, error: assignError } = await admin!
    .from("course_assignments")
    .select("profile_id, courses(status)")
    .eq("role", "ta")

  if (assignError) throw new Error(`assignments: ${assignError.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tas ?? []).map((ta: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taAssignments = (assignments ?? []).filter((a: any) => a.profile_id === ta.id)
    const active = taAssignments.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.courses?.status !== "final_approved" && a.courses?.status !== "submitted_to_admin"
    )
    const needsFixes = taAssignments.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.courses?.status === "admin_changes_requested"
    )
    return {
      id: ta.id,
      full_name: ta.full_name,
      email: ta.email,
      active_courses: active.length,
      needs_fixes: needsFixes.length,
    }
  })
}

async function fetchAuditEvents(admin: ReturnType<typeof createAdminClient>): Promise<AuditEvent[]> {
  const { data, error } = await admin!
    .from("course_status_events")
    .select(`
      id, from_status, to_status, note, created_at, actor_role,
      courses ( id, title ),
      profiles!course_status_events_actor_id_fkey ( full_name, email )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(`audit: ${error.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    course_id: row.courses?.id ?? "",
    course_title: row.courses?.title ?? "—",
    from_status: row.from_status,
    to_status: row.to_status,
    actor_name: row.profiles?.full_name ?? null,
    actor_email: row.profiles?.email ?? "",
    actor_role: row.actor_role,
    note: row.note,
    created_at: row.created_at,
  }))
}

// ─── Main entrypoint ──────────────────────────────────────────────────────────

export async function getSuperAdminData(): Promise<SuperAdminData> {
  const admin = getAdmin()

  const [courses, users, statusCounts, stuckCourses, taWorkload, auditEvents] = await Promise.all([
    fetchCourses(admin),
    fetchUsers(admin),
    fetchStatusCounts(admin),
    fetchStuckCourses(admin),
    fetchTAWorkload(admin),
    fetchAuditEvents(admin),
  ])

  return { courses, users, statusCounts, stuckCourses, taWorkload, auditEvents }
}
