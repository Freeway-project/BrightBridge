import "server-only"

import { getCourseRepository, getProfileRepository, getHierarchyRepository } from "@/lib/repositories"
import { getPostgresPool } from "@/lib/postgres/pool"
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
    usersResult,
    totalResult,
    statusResult,
    stuckResult,
    workloadResult,
    auditResult,
    unitsResult,
    membersResult,
  ] = await Promise.allSettled([
    profileRepository.listUsers(1, 5000),
    courseRepository.countCourses(),
    courseRepository.listStatusCounts(),
    courseRepository.listStuckCourses(cutoff),
    courseRepository.listTAWorkload(),
    courseRepository.listAuditEvents(100),
    hierarchyRepository.listUnits(),
    hierarchyRepository.listAllMembers(),
  ])

  const usersPage = usersResult.status === "fulfilled" ? usersResult.value : { data: [] }

  return {
    users: usersPage.data.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      created_at: user.createdAt,
    })),
    totalCourses: totalResult.status === "fulfilled" ? totalResult.value : 0,
    statusCounts: statusResult.status === "fulfilled" ? statusResult.value : [],
    stuckCourses: stuckResult.status === "fulfilled" ? stuckResult.value : [],
    taWorkload: workloadResult.status === "fulfilled" ? workloadResult.value : [],
    auditEvents: auditResult.status === "fulfilled" ? auditResult.value : [],
    units: unitsResult.status === "fulfilled" ? unitsResult.value : [],
    members: membersResult.status === "fulfilled" ? membersResult.value : [],
  }
}

export async function getPaginatedSuperAdminCourses(page: number, pageSize: number, search: string): Promise<PaginatedResult<CourseRow>> {
  const courseRepository = getCourseRepository()
  return courseRepository.listSuperAdminCourses(page, pageSize, search)
}

// Page of audit-trail events, newest first. The Audit Trail view seeds itself
// with page 1 and pulls further pages on scroll, so we never load the whole
// history into the browser at once.
export async function getPaginatedAuditEvents(page: number, pageSize: number): Promise<PaginatedResult<AuditEvent>> {
  const courseRepository = getCourseRepository()
  return courseRepository.listAuditEventsPage(page, pageSize)
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

// Count of unresolved support messages, for the Support tab badge.
export async function getOpenSupportMessageCount(): Promise<number> {
  const pool = getPostgresPool()
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM support_messages WHERE status <> 'resolved'`,
  )
  return Number(rows[0]?.count ?? 0)
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
