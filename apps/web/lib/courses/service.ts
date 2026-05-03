import "server-only";

import {
  assertCanTransition,
  COURSE_STATUSES,
  ASSIGNMENT_ROLES,
  type CourseStatus,
  type Role,
  type AssignmentRole,
  type EffectiveRole
} from "@coursebridge/workflow";
import { getAuthContext, requireAnyRole, requireProfile, type AppProfile } from "@/lib/auth/context";
import { getCourseRepository, getProfileRepository, getReviewRepository, getHierarchyRepository } from "@/lib/repositories";
import type { CourseSummary, ReviewProgress, SectionProgress, CourseAssignmentRecord, InstructorCourse } from "@/lib/repositories/contracts";

const adminRoles: readonly Role[] = ["admin_full", "super_admin"];
const roleWideCourseRoles: readonly Role[] = ["admin_full", "admin_viewer", "super_admin"];

export type { CourseSummary, ReviewProgress, SectionProgress, InstructorCourse } from "@/lib/repositories/contracts";

const LEADERSHIP_TITLES = new Set(["dean", "assistant_dean", "dept_head", "chair"]);

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
  role: AssignmentRole;
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

  // TAs and instructors only see courses assigned to them
  const isScoped = context.profile.role === "standard_user" || context.profile.role === "instructor";
  const summaries = isScoped
    ? await getCourseRepository().listAssignedCourses(context.profile.id)
    : await getCourseRepository().listAccessibleCourses();

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

  if (!(ASSIGNMENT_ROLES as readonly string[]).includes(input.role)) {
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

  const assignment = await getCourseRepository().getCourseAssignment(
    input.courseId,
    context.profile.id
  );

  const effectiveRole: EffectiveRole =
    context.profile.role === "standard_user"
      ? (assignment?.role ?? "standard_user")
      : context.profile.role;

  assertCanTransition({
    role: effectiveRole,
    from: fromStatus,
    to: input.toStatus
  });

  await assertCanActOnCourse({
    courseId: course.id,
    profile: context.profile,
    assignment
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

async function assertCanActOnCourse({
  courseId,
  profile,
  assignment
}: {
  courseId: string;
  profile: AppProfile;
  assignment: CourseAssignmentRecord | null;
}) {
  if ((roleWideCourseRoles as readonly Role[]).includes(profile.role)) {
    return;
  }

  if (!assignment) {
    throw new Error("You are not assigned to this course.");
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

export type InstructorDashboardData = {
  myCourses: InstructorCourse[];
  departmentCourses: CourseSummary[];
  isDeptHead: boolean;
};

export async function getInstructorDashboardData(): Promise<InstructorDashboardData> {
  const context = await requireProfile();
  if (context.kind !== "profile") {
    return { myCourses: [], departmentCourses: [], isDeptHead: false };
  }

  const profileId = context.profile.id;

  const [myCourses, userUnits] = await Promise.all([
    getCourseRepository().listInstructorCourses(profileId),
    getHierarchyRepository().getUserUnits(profileId),
  ]);

  const leadershipUnits = userUnits.filter((u) => LEADERSHIP_TITLES.has(u.title));

  if (leadershipUnits.length === 0) {
    return { myCourses, departmentCourses: [], isDeptHead: false };
  }

  const unitIds = leadershipUnits.map((u) => u.orgUnitId);
  const departmentCourses = await getCourseRepository().listCoursesByUnitAncestry(unitIds);

  return { myCourses, departmentCourses, isDeptHead: true };
}
