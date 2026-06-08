import "server-only"

import type { CourseStatus } from "@coursebridge/workflow"
import { requireProfile } from "@/lib/auth/context"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import { getPostgresPool } from "@/lib/postgres/pool"
import { isPostgresProvider } from "@/lib/repositories/provider"
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
}

// Walk parent_id up to the root using the already-loaded unit map (no extra query).
function buildBreadcrumb(unitId: string, unitById: Map<string, OrgUnit>): OrgCrumb[] {
  const chain: OrgCrumb[] = []
  let cur: OrgUnit | undefined = unitById.get(unitId)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift({ id: cur.id, name: cur.name, type: cur.type })
    cur = cur.parentId ? unitById.get(cur.parentId) : undefined
  }
  return chain
}

export async function getOrgExplorerView(unitId: string | null): Promise<OrgExplorerView> {
  await requireOrgViewer()
  const hierarchy = getHierarchyRepository()
  const courseRepo = getCourseRepository()

  const [allUnits, allMembers] = await Promise.all([
    hierarchy.listUnits(),
    hierarchy.listAllMembers(),
  ])
  const unitById = new Map(allUnits.map((u) => [u.id, u]))
  const current = unitId ? unitById.get(unitId) ?? null : null
  // An unknown unit id falls back to the top level rather than erroring.
  const effectiveUnitId = current ? current.id : null

  const childUnits = allUnits
    .filter((u) => (u.parentId ?? null) === effectiveUnitId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const childIds = childUnits.map((u) => u.id)

  const memberCountByUnit = new Map<string, number>()
  for (const m of allMembers) {
    memberCountByUnit.set(m.orgUnitId, (memberCountByUnit.get(m.orgUnitId) ?? 0) + 1)
  }

  const [childCourseCounts, facets, globalCounts] = await Promise.all([
    childIds.length
      ? courseRepo.getChildUnitCourseCounts(childIds)
      : Promise.resolve({} as Record<string, number>),
    effectiveUnitId ? courseRepo.getUnitCourseFacets(effectiveUnitId) : Promise.resolve(null),
    effectiveUnitId ? Promise.resolve(null) : courseRepo.listStatusCounts(),
  ])

  const children: OrgChild[] = childUnits.map((u) => ({
    id: u.id,
    name: u.name,
    type: u.type,
    courseCount: childCourseCounts[u.id] ?? 0,
    memberCount: memberCountByUnit.get(u.id) ?? 0,
  }))

  let leadership: OrgLeader[] = []
  if (effectiveUnitId) {
    const unitMembers = allMembers.filter((m) => m.orgUnitId === effectiveUnitId)
    if (unitMembers.length) {
      const memberIds = unitMembers.map((m) => m.profileId)
      let profiles: Array<{ id: string; full_name: string | null; email: string }> = []

      if (isPostgresProvider()) {
        const pool = getPostgresPool()
        const result = await pool.query<{ id: string; full_name: string | null; email: string }>(
          `SELECT id, full_name, email FROM profiles WHERE id = ANY($1::uuid[])`,
          [memberIds],
        )
        profiles = result.rows
      } else {
        const admin = getSupabaseAdminClientOrThrow()
        const { data } = await admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", memberIds)
        profiles = (data ?? []) as Array<{ id: string; full_name: string | null; email: string }>
      }

      const nameById = new Map<string, string>()
      for (const p of profiles) {
        nameById.set(p.id, p.full_name?.trim() || p.email)
      }
      leadership = unitMembers
        .map((m) => ({
          id: m.id,
          name: nameById.get(m.profileId) ?? "Unknown",
          title: ROLE_TITLE_LABELS[m.title] ?? m.title,
          rawTitle: m.title,
        }))
        .sort(
          (a, b) =>
            (ROLE_TITLE_RANK[a.rawTitle] ?? 99) - (ROLE_TITLE_RANK[b.rawTitle] ?? 99) ||
            a.name.localeCompare(b.name),
        )
    }
  }

  const statusCounts = facets ? facets.statusCounts : globalCounts ?? []
  const courseTotal = facets ? facets.total : statusCounts.reduce((sum, c) => sum + c.count, 0)
  const terms = facets ? facets.terms : []

  return {
    current: current ? { id: current.id, name: current.name, type: current.type } : null,
    breadcrumb: effectiveUnitId ? buildBreadcrumb(effectiveUnitId, unitById) : [],
    children,
    leadership,
    statusCounts,
    courseTotal,
    terms,
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
