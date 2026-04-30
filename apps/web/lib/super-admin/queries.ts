import "server-only"

import { getCourseRepository, getProfileRepository } from "@/lib/repositories"
import type {
  AuditEvent,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow as CourseRow,
  TAWorkload,
} from "@/lib/repositories/contracts"
export type {
  AuditEvent,
  StatusCount,
  StuckCourse,
  SuperAdminCourseRow as CourseRow,
  TAWorkload,
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
  courses: CourseRow[]
  users: UserRow[]
  statusCounts: StatusCount[]
  stuckCourses: StuckCourse[]
  taWorkload: TAWorkload[]
  auditEvents: AuditEvent[]
}

export async function getSuperAdminData(): Promise<SuperAdminData> {
  const courseRepository = getCourseRepository()
  const profileRepository = getProfileRepository()
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

  const [courseRows, users, statusCounts, stuckCourses, taWorkload, auditEvents] = await Promise.all([
    courseRepository.listSuperAdminCourses(),
    profileRepository.listUsers(),
    courseRepository.listStatusCounts(),
    courseRepository.listStuckCourses(cutoff),
    courseRepository.listTAWorkload(),
    courseRepository.listAuditEvents(100),
  ])

  return {
    courses: courseRows,
    users: users.map((user) => ({
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
  }
}
