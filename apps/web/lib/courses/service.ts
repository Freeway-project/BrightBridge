import "server-only";

import {
  assertCanTransition,
  COURSE_STATUSES,
  ROLES,
  type CourseStatus,
  type Role
} from "@coursebridge/workflow";
import { getAuthContext, requireAnyRole, requireProfile, type AppProfile } from "@/lib/auth/context";
import { getCourseRepository, getProfileRepository, getReviewRepository } from "@/lib/repositories";
import type { CourseSummary, ReviewProgress, SectionProgress } from "@/lib/repositories/contracts";

const adminRoles: readonly Role[] = ["admin", "super_admin"];
const roleWideCourseRoles: readonly Role[] = ["admin", "communications", "super_admin"];

export type { CourseSummary, ReviewProgress, SectionProgress } from "@/lib/repositories/contracts";

export type CreateCourseInput = {
  sourceCourseId?: string | null;
  targetCourseId?: string | null;
  title: string;
  term?: string | null;
  department?: string | null;
};

export type AssignUserToCourseInput = {
  courseId: string;
  profileId: string;
  role: Role;
};

export type TransitionCourseStatusInput = {
  courseId: string;
  toStatus: CourseStatus;
  note?: string | null;
};

export async function getAccessibleCourses() {
  const context = await getAuthContext();

  if (context.kind !== "profile") {
    return {
      context,
      courses: [] as CourseSummary[]
    };
  }

  const summaries = await getCourseRepository().listAccessibleCourses();
  const progressMap = await fetchReviewProgressForCourses(summaries.map((course) => course.id));

  return {
    context,
    courses: summaries.map((course) => ({ ...course, reviewProgress: progressMap.get(course.id) })),
  };
}

export async function fetchReviewProgressForCourses(
  courseIds: string[]
): Promise<Map<string, ReviewProgress>> {
  return getReviewRepository().getReviewProgressForCourses(courseIds);
}

export async function createCourse(input: CreateCourseInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles);

  const title = input.title.trim();

  if (!title) {
    throw new Error("Course title is required.");
  }

  const course = await getCourseRepository().createCourse({
    ...input,
    title,
    status: "course_created",
    createdBy: context.profile.id
  });

  await insertStatusEvent({
    courseId: course.id,
    fromStatus: null,
    toStatus: "course_created",
    actor: context.profile,
    note: "Course created."
  });

  return course;
}

export async function assignUserToCourse(input: AssignUserToCourseInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles);

  if (!ROLES.includes(input.role)) {
    throw new Error(`Unsupported assignment role: ${input.role}`);
  }

  const profile = await getProfileRepository().getProfileById(input.profileId);

  if (!profile) {
    throw new Error("Assigned profile does not exist.");
  }

  await getCourseRepository().assignUserToCourse({
    courseId: input.courseId,
    profileId: input.profileId,
    role: input.role,
    assignedBy: context.profile.id
  });
}

export async function transitionCourseStatus(input: TransitionCourseStatusInput) {
  const context = await requireProfile();

  if (!COURSE_STATUSES.includes(input.toStatus)) {
    throw new Error(`Unsupported target status: ${input.toStatus}`);
  }

  const course = await getCourseRepository().getCourseSummaryById(input.courseId);
  const fromStatus = course.status;

  assertCanTransition({
    role: context.profile.role,
    from: fromStatus,
    to: input.toStatus
  });

  await assertCanActOnCourse({
    courseId: course.id,
    profile: context.profile
  });

  const updatedCourse = await getCourseRepository().updateCourseStatus(course.id, input.toStatus);

  await insertStatusEvent({
    courseId: course.id,
    fromStatus,
    toStatus: input.toStatus,
    actor: context.profile,
    note: cleanOptionalText(input.note)
  });

  return updatedCourse;
}

async function assertCanActOnCourse({ courseId, profile }: { courseId: string; profile: AppProfile }) {
  if ((roleWideCourseRoles as readonly Role[]).includes(profile.role)) {
    return;
  }

  const isAssigned = await getCourseRepository().hasAssignment(courseId, profile.id, profile.role);

  if (!isAssigned) {
    throw new Error("You are not assigned to this course with the required role.");
  }
}

async function insertStatusEvent({
  courseId,
  fromStatus,
  toStatus,
  actor,
  note
}: {
  courseId: string;
  fromStatus: CourseStatus | null;
  toStatus: CourseStatus;
  actor: AppProfile;
  note?: string | null;
}) {
  await getCourseRepository().insertStatusEvent({
    courseId,
    fromStatus,
    toStatus,
    actorId: actor.id,
    actorRole: actor.role,
    note: cleanOptionalText(note)
  });
}

function cleanOptionalText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
