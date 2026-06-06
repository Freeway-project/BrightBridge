"use server"

import { requireProfile } from "@/lib/auth/context"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"

const COURSE_LIMIT = 100

export type UnitDetail = {
  unit: { id: string; name: string; type: string } | null
  childUnits: { id: string; name: string; type: string }[]
  members: { id: string; name: string; title: string }[]
  courses: { id: string; title: string; status: string; term: string | null; department: string | null }[]
  courseTotal: number
}

/**
 * Loads the detail panel for a clicked org-chart node: the unit's direct child
 * units, its leadership members, and all courses in its subtree (capped for
 * display). Reuses listCoursesByUnitAncestry. Super-admin / provost / admin.
 */
export async function getUnitDetail(unitId: string): Promise<UnitDetail> {
  const context = await requireProfile()
  if (
    context.profile.role !== "super_admin" &&
    context.profile.role !== "provost" &&
    context.profile.role !== "admin_full"
  ) {
    throw new Error("Unauthorized")
  }

  const hierarchy = getHierarchyRepository()
  const [unit, allUnits, allMembers, courses] = await Promise.all([
    hierarchy.getUnitById(unitId),
    hierarchy.listUnits(),
    hierarchy.listAllMembers(),
    getCourseRepository().listCoursesByUnitAncestry([unitId]),
  ])

  const childUnits = allUnits
    .filter((u) => u.parentId === unitId)
    .map((u) => ({ id: u.id, name: u.name, type: u.type }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const unitMembers = allMembers.filter((m) => m.orgUnitId === unitId)
  const nameById = new Map<string, string>()
  if (unitMembers.length > 0) {
    const admin = getSupabaseAdminClientOrThrow()
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in(
        "id",
        unitMembers.map((m) => m.profileId),
      )
    for (const p of profiles ?? []) {
      nameById.set(p.id, (p.full_name as string)?.trim() || (p.email as string))
    }
  }

  const members = unitMembers.map((m) => ({
    id: m.id,
    name: nameById.get(m.profileId) ?? "Unknown",
    title: ROLE_TITLE_LABELS[m.title] ?? m.title,
  }))

  return {
    unit: unit ? { id: unit.id, name: unit.name, type: unit.type } : null,
    childUnits,
    members,
    courses: courses.slice(0, COURSE_LIMIT).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      term: c.term,
      department: c.department,
    })),
    courseTotal: courses.length,
  }
}
