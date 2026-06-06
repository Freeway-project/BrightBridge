import "server-only"

import { getCourseRepository, getProfileRepository, getHierarchyRepository } from "@/lib/repositories"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
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
import { ROLE_TITLE_LABELS, ROLE_TITLE_RANK } from "@/lib/super-admin/roles"

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

// A node in the org hierarchy tree. `data` is the payload the HierarchyTree
// renderer reads (unit vs. member, role, etc.); `expanded` seeds the tree's
// default open/closed state.
export type OrgTreeNode = {
  key: string
  label: string
  expanded?: boolean
  data: {
    kind: "unit" | "member"
    id: string
    name: string
    unitType?: string
    title?: string
    /** Raw title key (dean, dept_head, …) used for role-based coloring. */
    rawTitle?: string
  }
  children?: OrgTreeNode[]
}

// Units at depth < EXPAND_DEPTH render expanded; deeper levels start collapsed
// so the chart opens on the root and the user drills down.
const EXPAND_DEPTH = 1

/**
 * Builds the nested org tree (units, with leadership members as child nodes)
 * that the HierarchyTree renders. Reuses the units/members/users already
 * fetched by getSuperAdminData — no extra query. Names resolve from users;
 * titles are pretty-printed.
 */
export function buildOrgTree(
  data: Pick<SuperAdminData, "units" | "members" | "users">,
): OrgTreeNode[] {
  const nameById = new Map(data.users.map((u) => [u.id, u.full_name?.trim() || u.email]))

  const unitsByParent = new Map<string | null, typeof data.units>()
  for (const u of data.units) {
    const arr = unitsByParent.get(u.parentId) ?? []
    arr.push(u)
    unitsByParent.set(u.parentId, arr)
  }

  const membersByUnit = new Map<string, typeof data.members>()
  for (const m of data.members) {
    const arr = membersByUnit.get(m.orgUnitId) ?? []
    arr.push(m)
    membersByUnit.set(m.orgUnitId, arr)
  }

  const buildUnit = (u: (typeof data.units)[number], depth: number): OrgTreeNode => {
    const childUnits = (unitsByParent.get(u.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => buildUnit(c, depth + 1))

    const memberNodes: OrgTreeNode[] = (membersByUnit.get(u.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          (ROLE_TITLE_RANK[a.title] ?? 99) - (ROLE_TITLE_RANK[b.title] ?? 99) ||
          (nameById.get(a.profileId) ?? "").localeCompare(nameById.get(b.profileId) ?? ""),
      )
      .map((m) => {
        const name = nameById.get(m.profileId) ?? "Unknown"
        return {
          key: m.id,
          label: name,
          data: {
            kind: "member" as const,
            id: m.id,
            name,
            title: ROLE_TITLE_LABELS[m.title] ?? m.title,
            rawTitle: m.title,
          },
        }
      })

    return {
      key: u.id,
      label: u.name,
      expanded: depth < EXPAND_DEPTH,
      data: { kind: "unit", id: u.id, name: u.name, unitType: u.type },
      children: [...childUnits, ...memberNodes],
    }
  }

  return (unitsByParent.get(null) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((root) => buildUnit(root, 0))
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
