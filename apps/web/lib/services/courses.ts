import "server-only";

import { assertCanTransition, type CourseStatus, type EffectiveRole, type Role } from "@coursebridge/workflow";
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

  const assignment = await repo.getCourseAssignment(courseId, actorId);
  const effectiveRole: EffectiveRole =
    actorRole === "standard_user"
      ? (assignment?.role ?? "standard_user")
      : actorRole;

  assertCanTransition({ role: effectiveRole, from, to });

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
