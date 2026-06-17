import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
import { getCourseRepository, getHierarchyRepository, getProfileRepository } from "@/lib/repositories"
import { getPostgresPool } from "@/lib/postgres/pool"
import type {
  AdminCourseRow,
  OrgUnit,
  PaginatedResult,
  StatusCount,
} from "@/lib/repositories/contracts"
import { ROLE_TITLE_LABELS, ROLE_TITLE_RANK } from "@/lib/super-admin/roles"

// Cross-unit oversight roles — same set the /hierarchy page and getUnitDetail allow.
async function requireOrgViewer() {
  const context = await requireProfile()
  const role = context.profile.role
  if (
    role !== "super_admin" &&
    role !== "provost" &&
    role !== "admin_full" &&
    role !== "admin_viewer"
  ) {
    throw new Error("Unauthorized")
  }
  return context
}

export type OrgCrumb = { id: string; name: string; type: string }
export type OrgChild = {
  id: string
  name: string
  type: string
  courseCount: number
  memberCount: number
}
export type OrgLeader = { id: string; name: string; title: string; rawTitle: string }
export type OrgTreeNode = {
  id: string
  parentId: string | null
  name: string
  type: string
  courseCount: number
  memberCount: number
}
export type OrgUnitMemberDetail = {
  id: string
  profileId: string
  orgUnitId: string
  title: string
  isPrimary: boolean
  name: string
  email: string
}
export type OrgUserOption = {
  id: string
  name: string
  email: string
}

export type OrgExplorerView = {
  /** The unit currently being viewed, or null at the institution (top) level. */
  current: OrgCrumb | null
  /** Root → current trail (empty at top level). */
  breadcrumb: OrgCrumb[]
  /** Direct child units (or root units at top level), each with subtree counts. */
  children: OrgChild[]
  /** Leadership of the current unit. */
  leadership: OrgLeader[]
  /** Status breakdown for the current subtree (or the whole institution at top level). */
  statusCounts: StatusCount[]
  courseTotal: number
  /** Distinct terms in the current subtree, for the course term filter. */
  terms: string[]
  /** Flat tree data for the persistent hierarchy navigator. */
  tree: OrgTreeNode[]
  /** Members assigned directly to the selected unit. */
  selectedMembers: OrgUnitMemberDetail[]
  /** Whether the current role can manage units and memberships here. */
  canManage: boolean
  /** User options for the add-member action; omitted for read-only roles. */
  userOptions: OrgUserOption[]
}

function buildBreadcrumb(unitId: string, unitById: Map<string, OrgUnit>): OrgCrumb[] {
  const chain: OrgCrumb[] = []
  let cur: OrgUnit | undefined = unitById.get(unitId)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    if (cur.type !== "college") {
      chain.unshift({ id: cur.id, name: cur.name, type: cur.type })
    }
    cur = cur.parentId ? unitById.get(cur.parentId) : undefined
  }
  return chain
}

export async function getOrgExplorerView(unitId: string | null): Promise<OrgExplorerView> {
  const context = await requireOrgViewer()
  const canManage =
    context.profile.role === "super_admin" ||
    context.profile.role === "provost" ||
    context.profile.role === "admin_full"
  const hierarchy = getHierarchyRepository()
  const courseRepo = getCourseRepository()
  const profileRepo = getProfileRepository()

  const [allUnits, allMembers] = await Promise.all([
    hierarchy.listUnits(),
    hierarchy.listAllMembers(),
  ])
  const unitById = new Map(allUnits.map((u) => [u.id, u]))
  const current = unitId ? unitById.get(unitId) ?? null : null
  // An unknown unit id falls back to the top level rather than erroring.
  const effectiveUnitId = current ? current.id : null

  let childUnits = allUnits.filter((u) => (u.parentId ?? null) === effectiveUnitId)
  
  // Flatten college: if children contain a college, replace with the college's children (schools)
  if (childUnits.some((u) => u.type === "college")) {
    const collegeIds = new Set(childUnits.filter((u) => u.type === "college").map((u) => u.id))
    childUnits = allUnits.filter((u) => u.parentId && collegeIds.has(u.parentId))
  }
  
  childUnits = childUnits.sort((a, b) => a.name.localeCompare(b.name))
  const unitIds = allUnits.map((u) => u.id)

  const memberCountByUnit = new Map<string, number>()
  for (const m of allMembers) {
    memberCountByUnit.set(m.orgUnitId, (memberCountByUnit.get(m.orgUnitId) ?? 0) + 1)
  }

  const [unitCourseCounts, facets, globalCounts, usersPage] = await Promise.all([
    unitIds.length
      ? courseRepo.getChildUnitCourseCounts(unitIds)
      : Promise.resolve({} as Record<string, number>),
    effectiveUnitId ? courseRepo.getUnitCourseFacets(effectiveUnitId) : Promise.resolve(null),
    effectiveUnitId ? Promise.resolve(null) : courseRepo.listStatusCounts(),
    canManage ? profileRepo.listUsers(1, 5000) : Promise.resolve(null),
  ])

  const children: OrgChild[] = childUnits.map((u) => ({
    id: u.id,
    name: u.name,
    type: u.type,
    courseCount: unitCourseCounts[u.id] ?? 0,
    memberCount: memberCountByUnit.get(u.id) ?? 0,
  }))

  const selectedUnitMembers = effectiveUnitId
    ? allMembers.filter((m) => m.orgUnitId === effectiveUnitId)
    : []
  const memberIds = [...new Set(selectedUnitMembers.map((m) => m.profileId))]
  let selectedMembers: OrgUnitMemberDetail[] = []
  let leadership: OrgLeader[] = []
  if (memberIds.length) {
    const pool = getPostgresPool()
    const { rows: profiles } = await pool.query<{ id: string; full_name: string | null; email: string }>(
      `SELECT id, full_name, email FROM profiles WHERE id = ANY($1::uuid[])`,
      [memberIds],
    )

    const profileById = new Map(profiles.map((p) => [p.id, p]))
    selectedMembers = selectedUnitMembers
      .map((member) => {
        const profile = profileById.get(member.profileId)
        const email = profile?.email ?? ""
        return {
          id: member.id,
          profileId: member.profileId,
          orgUnitId: member.orgUnitId,
          title: member.title,
          isPrimary: member.isPrimary,
          name: profile?.full_name?.trim() || email || "Unknown",
          email,
        }
      })
      .sort(
        (a, b) =>
          (ROLE_TITLE_RANK[a.title] ?? 99) - (ROLE_TITLE_RANK[b.title] ?? 99) ||
          a.name.localeCompare(b.name),
      )

    leadership = selectedMembers.map((member) => ({
      id: member.id,
      name: member.name,
      title: ROLE_TITLE_LABELS[member.title] ?? member.title,
      rawTitle: member.title,
    }))
  }

  const statusCounts = facets ? facets.statusCounts : globalCounts ?? []
  const courseTotal = facets ? facets.total : statusCounts.reduce((sum, c) => sum + c.count, 0)
  const terms = facets ? facets.terms : []
  const tree = allUnits
    .filter((u) => u.type !== "college")
    .map((unit) => {
      let parentId = unit.parentId
      if (parentId) {
        const parent = unitById.get(parentId)
        if (parent && parent.type === "college") {
          parentId = parent.parentId
        }
      }
      return {
        id: unit.id,
        parentId,
        name: unit.name,
        type: unit.type,
        courseCount: unitCourseCounts[unit.id] ?? 0,
        memberCount: memberCountByUnit.get(unit.id) ?? 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const userOptions = (usersPage?.data ?? [])
    .map((user) => ({
      id: user.id,
      name: user.fullName?.trim() || user.email,
      email: user.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    current: current ? { id: current.id, name: current.name, type: current.type } : null,
    breadcrumb: effectiveUnitId ? buildBreadcrumb(effectiveUnitId, unitById) : [],
    children,
    leadership,
    statusCounts,
    courseTotal,
    terms,
    tree,
    selectedMembers,
    canManage,
    userOptions,
  }
}

export async function getOrgExplorerCourses(
  unitId: string,
  opts: {
    page?: number
    pageSize?: number
    search?: string
    status?: CourseStatus
    term?: string
  } = {},
): Promise<PaginatedResult<AdminCourseRow>> {
  await requireOrgViewer()
  const { page = 1, pageSize = 20, search, status, term } = opts
  return getCourseRepository().listCoursesByUnit(unitId, page, pageSize, { search, status, term })
}
