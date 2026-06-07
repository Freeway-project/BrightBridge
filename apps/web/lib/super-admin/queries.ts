import "server-only"

import { getCourseRepository, getProfileRepository, getHierarchyRepository } from "@/lib/repositories"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import { getPostgresPool } from "@/lib/postgres/pool"
import { isPostgresProvider } from "@/lib/repositories/provider"
import type {
  AuditEvent,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow as CourseRow,
  TAWorkload,
  OrgUnit,
  OrgUnitMember,
  PaginatedResult,
} from "@/lib/repositories/contracts"
export type {
  AuditEvent,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow as CourseRow,
  TAWorkload,
  PaginatedResult,
} from "@/lib/repositories/contracts"
import type { Role } from "@coursebridge/workflow"

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
}

export type SuperAdminData = {
  users: UserRow[]
  totalCourses: number
  statusCounts: StatusCount[]
  stuckCourses: StuckCourse[]
  taWorkload: TAWorkload[]
  auditEvents: AuditEvent[]
  units: OrgUnit[]
  members: OrgUnitMember[]
}

export async function getSuperAdminData(): Promise<SuperAdminData> {
  const courseRepository = getCourseRepository()
  const profileRepository = getProfileRepository()
  const hierarchyRepository = getHierarchyRepository()
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersPage,
    totalCourses,
    statusCounts,
    stuckCourses,
    taWorkload,
    auditEvents,
    units,
    members
  ] = await Promise.all([
    profileRepository.listUsers(1, 5000), // Get all users for organization dropdowns
    courseRepository.countCourses(),
    courseRepository.listStatusCounts(),
    courseRepository.listStuckCourses(cutoff),
    courseRepository.listTAWorkload(),
    courseRepository.listAuditEvents(100),
    hierarchyRepository.listUnits(),
    hierarchyRepository.listAllMembers(),
  ])

  return {
    users: usersPage.data.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      created_at: user.createdAt,
    })),
    totalCourses,
    statusCounts,
    stuckCourses,
    taWorkload,
    auditEvents,
    units,
    members,
  }
}

export async function getPaginatedSuperAdminCourses(page: number, pageSize: number, search: string): Promise<PaginatedResult<CourseRow>> {
  const courseRepository = getCourseRepository()
  return courseRepository.listSuperAdminCourses(page, pageSize, search)
}

export type SupportMessageRow = {
  id: string
  sender_role: string
  type: "message" | "poke"
  subject: string | null
  body: string
  status: "open" | "read" | "resolved"
  created_at: string
  sender:
    | { full_name: string | null; role: string | null }
    | { full_name: string | null; role: string | null }[]
    | null
}

// Paginated list of every support message (pokes + notes) for the super-admin
// Support panel — "who asked what". Uses the admin client; access to this data
// is already gated by the super_admin auth check on the page.
export async function getPaginatedSuperAdminSupportMessages(
  page: number,
  pageSize: number,
  search: string,
): Promise<PaginatedResult<SupportMessageRow>> {
  if (isPostgresProvider()) {
    const pool = getPostgresPool()
    const values: unknown[] = []
    let whereSql = ""
    if (search) {
      values.push(`%${search}%`)
      whereSql = `WHERE (s.subject ILIKE $1 OR s.body ILIKE $1)`
    }
    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM support_messages s ${whereSql}`,
      values,
    )
    const total = Number(countResult.rows[0]?.total ?? "0")

    const from = (page - 1) * pageSize
    values.push(pageSize, from)
    const limitParam = `$${values.length - 1}`
    const offsetParam = `$${values.length}`
    const { rows } = await pool.query<{
      id: string
      sender_role: string
      type: "message" | "poke"
      subject: string | null
      body: string
      status: "open" | "read" | "resolved"
      created_at: string
      sender_full_name: string | null
      sender_profile_role: string | null
    }>(
      `
        SELECT s.id, s.sender_role, s.type, s.subject, s.body, s.status, s.created_at,
               p.full_name AS sender_full_name, p.role AS sender_profile_role
        FROM support_messages s
        LEFT JOIN profiles p ON p.id = s.sender_profile_id
        ${whereSql}
        ORDER BY s.created_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      values,
    )
    return {
      data: rows.map((row) => ({
        id: row.id,
        sender_role: row.sender_role,
        type: row.type,
        subject: row.subject,
        body: row.body,
        status: row.status,
        created_at: row.created_at,
        sender: { full_name: row.sender_full_name, role: row.sender_profile_role },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  const admin = getSupabaseAdminClientOrThrow()
  let query = admin
    .from("support_messages")
    .select(
      "id, sender_role, type, subject, body, status, created_at, sender:sender_profile_id ( full_name, role )",
      { count: "exact" },
    )

  if (search) {
    query = query.or(`subject.ilike.%${search}%,body.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error("Could not load support messages: " + error.message)
  }

  const total = count ?? 0
  return {
    data: (data ?? []) as unknown as SupportMessageRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// Count of unresolved support messages, for the Support tab badge.
export async function getOpenSupportMessageCount(): Promise<number> {
  if (isPostgresProvider()) {
    const pool = getPostgresPool()
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM support_messages WHERE status <> 'resolved'`,
    )
    return Number(rows[0]?.count ?? 0)
  }

  const admin = getSupabaseAdminClientOrThrow()
  const { count, error } = await admin
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .neq("status", "resolved")

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function getPaginatedUsers(page: number, pageSize: number, search: string): Promise<PaginatedResult<UserRow>> {
  const profileRepository = getProfileRepository()
  const result = await profileRepository.listUsers(page, pageSize, search)
  return {
    ...result,
    data: result.data.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      created_at: user.createdAt,
    }))
  }
}
