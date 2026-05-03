import "server-only";

import { assertCanTransition, type CourseStatus, type Role } from "@coursebridge/workflow";
import { getCourseRepository } from "@/lib/repositories";
import type { CourseSummary } from "@/lib/repositories/contracts";

export type { CourseSummary as CourseRow };

export async function getAssignedCourses(userId: string): Promise<CourseSummary[]> {
  return getCourseRepository().listAssignedCourses(userId);
}

export async function getCourseById(
  courseId: string,
  userId: string,
): Promise<CourseSummary | null> {
  return getCourseRepository().getAssignedCourseById(courseId, userId);
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
