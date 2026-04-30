import "server-only"

import { getCourseRepository, getProfileRepository, getHierarchyRepository } from "@/lib/repositories"
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
    statusCounts, 
    stuckCourses, 
    taWorkload, 
    auditEvents,
    units,
    members
  ] = await Promise.all([
    profileRepository.listUsers(1, 5000), // Get all users for organization dropdowns
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
