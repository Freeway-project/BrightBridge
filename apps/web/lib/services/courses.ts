import "server-only";

import {
  assertCanTransition,
  type AssignmentRole,
  type CourseStatus,
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

export async function transitionCourseStatus({
  courseId,
  from,
  to,
  actorId,
  actorRole,
  note,
}: {
  courseId: string;
  from: CourseStatus;
  to: CourseStatus;
  actorId: string;
  actorRole: Role;
  note?: string;
}) {
  const repo = getCourseRepository();

  // TAs and instructors must be assigned to the course
  if (actorRole === "standard_user" || actorRole === "instructor") {
    const assignment = await repo.getCourseAssignment(courseId, actorId);
    if (!assignment) {
      throw new Error("You are not assigned to this course.");
    }
  }

  // Transition is checked against the profile role (not the assignment role —
  // assignment role "staff" is not a workflow permission level)
  assertCanTransition({ role: actorRole, from, to });

  await repo.updateCourseStatus(courseId, to);
  await repo.insertStatusEvent({
    courseId,
    fromStatus: from,
    toStatus: to,
    actorId,
    actorRole,
    note: note ?? null,
  });
}
