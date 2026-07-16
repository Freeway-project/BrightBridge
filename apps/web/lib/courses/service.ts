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
import type {
  AccessibleCourseAggregates,
  AccessibleCourseScope,
  CourseSummary,
  PaginatedResult,
  ReviewProgress,
  SectionProgress,
  CourseAssignmentRecord,
  InstructorCourse,
} from "@/lib/repositories/contracts";
import { LEADERSHIP_TITLES, highestLeadershipTitle } from "@/lib/hierarchy/leadership";

const adminRoles: readonly Role[] = ["admin_full", "super_admin"];
const roleWideCourseRoles: readonly Role[] = ["admin_full", "admin_viewer", "super_admin", "provost"];

export type { CourseSummary, ReviewProgress, SectionProgress, InstructorCourse, SubmissionEvent } from "@/lib/repositories/contracts";

/**
 * Result of checking whether an actor is acting as an org-hierarchy leader on a
 * course they don't own. `delegated` true means: not the assigned instructor,
 * holds a leadership title, and has hierarchy access over the course's unit.
 * `onBehalfOf` is the assigned instructor's profile id (null if the course has
 * none — the leader may still act, on-behalf simply stays null).
 */
export type DelegationContext = {
  delegated: boolean;
  onBehalfOf: string | null;
  onBehalfOfName: string | null;
  leaderTitle: string | null;
};

const NO_DELEGATION: DelegationContext = {
  delegated: false,
  onBehalfOf: null,
  onBehalfOfName: null,
  leaderTitle: null,
};

/**
 * Resolves whether `profile` may act on `courseId` via org-hierarchy delegation
 * (a dean / dept-head acting for an instructor). Wide roles and the assigned
 * instructor are NOT delegation — they have direct authority — so this returns
 * a non-delegated context for them.
 */
export async function resolveDelegationContext({
  courseId,
  profile,
}: {
  courseId: string;
  profile: AppProfile;
}): Promise<DelegationContext> {
  // Wide roles already have direct authority; never a delegated action.
  if ((roleWideCourseRoles as readonly Role[]).includes(profile.role)) {
    return NO_DELEGATION;
  }

  const hierarchy = getHierarchyRepository();
  const units = await hierarchy.getUserUnits(profile.id);
  const leaderTitle = highestLeadershipTitle(units.map((u) => u.title));
  if (!leaderTitle) return NO_DELEGATION;

  if (!(await hierarchy.hasHierarchyAccess(profile.id, courseId))) {
    return NO_DELEGATION;
  }

  const course = await getCourseRepository().getAdminCourse(courseId);
  const instructor = course?.instructor ?? null;

  // If the leader IS the assigned instructor, they act directly (assignment
  // path), not on anyone's behalf.
  if (instructor && instructor.id === profile.id) return NO_DELEGATION;

  return {
    delegated: true,
    onBehalfOf: instructor?.id ?? null,
    onBehalfOfName: instructor?.name ?? null,
    leaderTitle,
  };
}

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

// Default page size for the staff/admin /courses list view. Tuned for the card
// grid — small enough to render quickly, large enough that one viewport rarely
// triggers the next page fetch immediately.
export const ACCESSIBLE_COURSES_PAGE_SIZE = 24;

export type AccessibleCourseListInput = {
  page?: number;
  pageSize?: number;
  status?: CourseStatus;
  search?: string;
  subject?: string;
  term?: string;
};

export async function resolveAccessibleScope(): Promise<{
  scope: AccessibleCourseScope | null;
  canExport: boolean;
}> {
  const context = await getAuthContext();
  if (context.kind !== "profile") {
    return { scope: null, canExport: false };
  }
  const role = context.profile.role;
  const isScoped = role === "standard_user" || role === "instructor";
  const scope: AccessibleCourseScope = isScoped
    ? { kind: "assigned", profileId: context.profile.id, role: toAssignmentRole(role) }
    : { kind: "all" };
  return { scope, canExport: role === "admin_full" || role === "super_admin" };
}

export async function getAccessibleCoursesPage(
  input: AccessibleCourseListInput = {},
): Promise<PaginatedResult<CourseSummary>> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) {
    return { data: [], total: 0, page: 1, pageSize: input.pageSize ?? ACCESSIBLE_COURSES_PAGE_SIZE, totalPages: 0 };
  }
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? ACCESSIBLE_COURSES_PAGE_SIZE;
  const result = await getCourseRepository().listAccessibleCoursesPage(page, pageSize, {
    scope,
    status: input.status,
    search: input.search,
    subject: input.subject,
    term: input.term,
  });

  // Only enrich the rows actually returned to the page — the previous
  // load-everything path enriched the full set, which was the main per-row cost.
  const progressMap = await fetchReviewProgressForCourses(result.data.map((c) => c.id));
  return {
    ...result,
    data: result.data.map((c) => ({ ...c, reviewProgress: progressMap.get(c.id) })),
  };
}

export async function getAccessibleCourseAggregates(
  input: Pick<AccessibleCourseListInput, "search" | "subject" | "term"> = {},
): Promise<AccessibleCourseAggregates> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) return { statusCounts: {}, subjects: [], terms: [], total: 0 };
  return getCourseRepository().getAccessibleCourseAggregates(scope, input);
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

export type ReassignCourseStaffInput = {
  courseId: string;
  newProfileId: string;
  reason?: string | null;
};

export async function reassignCourseStaff(input: ReassignCourseStaffInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles); // ["admin_full", "super_admin"]

  const profile = await getProfileRepository().getProfileById(input.newProfileId);
  if (!profile) {
    throw new Error("Selected TA does not exist.");
  }
  if (profile.role !== "standard_user") {
    throw new Error("Courses can only be reassigned to a TA.");
  }

  await getCourseRepository().reassignCourseStaff({
    courseId: input.courseId,
    newProfileId: input.newProfileId,
    actorId: context.profile.id,
    reason: input.reason ?? null,
  });
}

export type SetCourseInstructorInput = {
  courseId: string;
  newProfileId: string;
  reason?: string | null;
};

/**
 * Assigns the course's instructor, atomically swapping any existing one. The
 * repository RPC enforces the one-instructor-per-course invariant and records
 * the course_instructor_reassignments trace (who/from/to/when/why).
 */
export async function setCourseInstructor(input: SetCourseInstructorInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles); // ["admin_full", "super_admin"]

  const profile = await getProfileRepository().getProfileById(input.newProfileId);
  if (!profile) {
    throw new Error("Selected instructor does not exist.");
  }
  if (profile.role !== "instructor") {
    throw new Error("Courses can only be assigned to an instructor.");
  }

  await getCourseRepository().setCourseInstructor({
    courseId: input.courseId,
    newProfileId: input.newProfileId,
    actorId: context.profile.id,
    reason: input.reason ?? null,
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

  const delegation = await assertCanActOnCourse({
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
    note: cleanOptionalText(input.note),
    actingOnBehalfOf: delegation?.onBehalfOf ?? null
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

/**
 * Authorizes the actor to act on the course and returns the delegation context
 * (non-null only when they acted as an org-hierarchy leader, so the caller can
 * record the on-behalf-of instructor). Throws when the actor has neither an
 * assignment, a wide role, nor hierarchy delegation.
 */
async function assertCanActOnCourse({
  courseId,
  profile,
  assignment
}: {
  courseId: string;
  profile: AppProfile;
  assignment: CourseAssignmentRecord | null;
}): Promise<DelegationContext | null> {
  if ((roleWideCourseRoles as readonly Role[]).includes(profile.role)) {
    return null;
  }

  // Directly assigned (TA or assigned instructor) — direct authority, no on-behalf.
  if (assignment) {
    return null;
  }

  // Not assigned: allow only when acting as a leader over the course's subtree.
  const delegation = await resolveDelegationContext({ courseId, profile });
  if (delegation.delegated) {
    return delegation;
  }

  throw new Error("You are not assigned to this course.");
}

async function insertStatusEvent({
  courseId,
  fromStatus,
  toStatus,
  actor,
  note,
  actingOnBehalfOf
}: {
  courseId: string;
  fromStatus: CourseStatus | null;
  toStatus: CourseStatus;
  actor: AppProfile;
  note?: string | null;
  actingOnBehalfOf?: string | null;
}) {
  await getCourseRepository().insertStatusEvent({
    courseId,
    fromStatus,
    toStatus,
    actorId: actor.id,
    actorRole: actor.role,
    note: cleanOptionalText(note),
    actingOnBehalfOf: actingOnBehalfOf ?? null
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
  isLeader: boolean;
};

export async function getInstructorDashboardData(): Promise<InstructorDashboardData> {
  const context = await requireProfile();
  if (context.kind !== "profile") {
    return { myCourses: [], departmentCourses: [], isLeader: false };
  }

  const profileId = context.profile.id;

  const [myCourses, userUnits] = await Promise.all([
    getCourseRepository().listInstructorCourses(profileId),
    getHierarchyRepository().getUserUnits(profileId),
  ]);

  const leadershipUnits = userUnits.filter((u) => LEADERSHIP_TITLES.has(u.title));

  if (leadershipUnits.length === 0) {
    return { myCourses, departmentCourses: [], isLeader: false };
  }

  const unitIds = leadershipUnits.map((u) => u.orgUnitId);
  const departmentCourses = await getCourseRepository().listCoursesByUnitAncestry(unitIds);

  return { myCourses, departmentCourses, isLeader: true };
}
