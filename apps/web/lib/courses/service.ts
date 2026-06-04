import "server-only";

import {
  assertCanTransition,
  COURSE_STATUSES,
  ASSIGNMENT_ROLES,
  type CourseStatus,
  type Role,
  type AssignmentRole,
} from "@coursebridge/workflow";
import { getAuthContext, requireAnyRole, requireProfile, type AppProfile } from "@/lib/auth/context";
import { getCourseRepository, getProfileRepository, getReviewRepository, getHierarchyRepository } from "@/lib/repositories";
import type { CourseSummary, ReviewProgress, SectionProgress, CourseAssignmentRecord, InstructorCourse } from "@/lib/repositories/contracts";

const adminRoles: readonly Role[] = ["admin_full", "super_admin"];
const roleWideCourseRoles: readonly Role[] = ["admin_full", "admin_viewer", "super_admin", "provost"];

export type { CourseSummary, ReviewProgress, SectionProgress, InstructorCourse, SubmissionEvent } from "@/lib/repositories/contracts";

const LEADERSHIP_TITLES = new Set(["dean", "assistant_dean", "dept_head", "chair"]);

function toAssignmentRole(profileRole: Role): AssignmentRole {
  if (profileRole === "standard_user") return "staff";
  if (profileRole === "instructor") return "instructor";
  throw new Error(`Cannot derive assignment role from profile role: ${profileRole}`);
}

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

  // TAs and instructors only see courses assigned to them, but across all
  // statuses — so a TA can still find courses they reviewed after those courses
  // advance past the TA stage (e.g. ready_for_instructor). The dashboard tabs
  // (Staging / With Instructor / Done) bucket the non-actionable ones for them.
  const isScoped = context.profile.role === "standard_user" || context.profile.role === "instructor";
  const summaries = isScoped
    ? await getCourseRepository().listAssignedCourses(
        context.profile.id,
        toAssignmentRole(context.profile.role),
      )
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

  if (input.role === "staff") {
    const adminCourse = await getCourseRepository().getAdminCourse(input.courseId);

    if (!adminCourse) {
      throw new Error("Course not found.");
    }

    if (adminCourse.ta && adminCourse.ta.id !== input.profileId) {
      throw new Error("This course is already assigned to a TA.");
    }
  }

  await getCourseRepository().assignUserToCourse({
    courseId: input.courseId,
    profileId: input.profileId,
    role: input.role,
    assignedBy: context.profile.id
  });
}

export async function updateCourseDepartment(courseId: string, orgUnitId: string | null) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles);

  await getCourseRepository().updateCourseOrgUnit(courseId, orgUnitId);
}

export async function getDepartments() {
  const units = await getHierarchyRepository().listUnits();
  return units.filter((u) => u.type === "department");
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

  // Workflow transitions are gated on the profile role, not the assignment role.
  // "staff" is an assignment-level label, not a workflow permission level.
  assertCanTransition({
    role: context.profile.role,
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

/**
 * Auto-advances a course to "instructor_viewing" the moment the instructor
 * opens their emailed review link. System-initiated: the clicker has no normal
 * session yet (the link itself is the authorization), so this bypasses
 * requireProfile and records the status event with the instructor as actor.
 * Idempotent — only transitions from "sent_to_instructor", so re-opening the
 * dashboard or opening after the instructor already responded is a no-op.
 */
export async function markInstructorViewingByLink(input: {
  courseId: string;
  instructorProfileId: string;
}) {
  const repo = getCourseRepository();
  const course = await repo.getCourseSummaryById(input.courseId);

  if (course.status !== "sent_to_instructor") {
    return course;
  }

  // Sanity-check the move is legal for an instructor before applying it.
  assertCanTransition({
    role: "instructor",
    from: "sent_to_instructor",
    to: "instructor_viewing"
  });

  const updatedCourse = await repo.updateCourseStatus(input.courseId, "instructor_viewing");

  await repo.insertStatusEvent({
    courseId: input.courseId,
    fromStatus: "sent_to_instructor",
    toStatus: "instructor_viewing",
    actorId: input.instructorProfileId,
    actorRole: "instructor",
    note: "Instructor opened the review link."
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

export async function getSubmissionHistory(courseId: string) {
  return getCourseRepository().listSubmissionHistory(courseId);
}

export async function getChangeRequestHistory(courseId: string) {
  return getCourseRepository().listChangeRequestHistory(courseId);
}

export async function getQuestionRoundHistory(courseId: string) {
  return getCourseRepository().listQuestionRoundHistory(courseId);
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
