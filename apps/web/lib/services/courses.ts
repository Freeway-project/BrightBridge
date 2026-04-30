import "server-only";

import { assertCanTransition, type CourseStatus } from "@coursebridge/workflow";
import type { Role } from "@coursebridge/workflow";
import { getCourseRepository } from "@/lib/repositories";

export type CourseRow = {
  id: string;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  created_at: string;
};

export async function getAssignedCourses(userId: string): Promise<CourseRow[]> {
  return getCourseRepository().listAssignedCourses(userId);
}

export async function getCourseById(
  courseId: string,
  userId: string,
): Promise<CourseRow | null> {
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
  assertCanTransition({ role: actorRole, from, to });
  const courses = getCourseRepository();
  await courses.updateCourseStatus(courseId, to);
  await courses.insertStatusEvent({
    courseId,
    fromStatus: from,
    toStatus: to,
    actorId,
    actorRole,
    note: note ?? null,
  });
}
