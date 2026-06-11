import "server-only";

import {
  type AssignmentRole,
  type Role,
} from "@coursebridge/workflow";
import { getCourseRepository } from "@/lib/repositories";
import type { CourseSummary } from "@/lib/repositories/contracts";

export type { CourseSummary as CourseRow };

function toAssignmentRole(profileRole: Role): AssignmentRole {
  if (profileRole === "standard_user") return "staff";
  if (profileRole === "instructor") return "instructor";
  if (profileRole === "admin_full" || profileRole === "super_admin" || profileRole === "admin_viewer") return "staff";
  throw new Error(`Cannot derive assignment role from profile role: ${profileRole}`);
}

export async function getAssignedCourses(userId: string, profileRole: Role): Promise<CourseSummary[]> {
  return getCourseRepository().listAssignedCourses(userId, toAssignmentRole(profileRole));
}

export async function getCourseById(
  courseId: string,
  userId: string,
  profileRole: Role,
): Promise<CourseSummary | null> {
  return getCourseRepository().getAssignedCourseById(courseId, userId, toAssignmentRole(profileRole));
}

