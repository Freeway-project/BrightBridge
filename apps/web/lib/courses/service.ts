import "server-only";

import {
  assertCanTransition,
  COURSE_STATUSES,
  ROLES,
  type CourseStatus,
  type Role
} from "@coursebridge/workflow";
import { getAuthContext, requireAnyRole, requireProfile, type AppProfile } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const adminRoles: readonly Role[] = ["admin", "super_admin"];
const roleWideCourseRoles: readonly Role[] = ["admin", "communications", "super_admin"];

export type SectionProgress = {
  exists: boolean;
  status: "draft" | "submitted" | null;
  responseData: Record<string, unknown> | null;
};

export type ReviewProgress = {
  courseMetadata: SectionProgress;
  reviewMatrix: SectionProgress;
  syllabusReview: SectionProgress;
};

export type CourseSummary = {
  id: string;
  sourceCourseId: string | null;
  targetCourseId: string | null;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewProgress?: ReviewProgress;
};

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

type CourseRow = {
  id: string;
  source_course_id: string | null;
  target_course_id: string | null;
  title: string;
  term: string | null;
  department: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function getAccessibleCourses() {
  const context = await getAuthContext();

  if (context.kind !== "profile") {
    return {
      context,
      courses: [] as CourseSummary[]
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load accessible courses: ${error.message}`);
  }

  const summaries = (data ?? []).map(toCourseSummary);
  const progressMap = await fetchReviewProgressForCourses(summaries.map((c) => c.id));

  return {
    context,
    courses: summaries.map((c) => ({ ...c, reviewProgress: progressMap.get(c.id) })),
  };
}

export async function fetchReviewProgressForCourses(
  courseIds: string[]
): Promise<Map<string, ReviewProgress>> {
  if (courseIds.length === 0) return new Map();

  const admin = createAdminClient();
  if (!admin) return new Map();

  const { data, error } = await admin
    .from("review_responses")
    .select("course_id, status, response_data, review_sections!inner(key)")
    .in("course_id", courseIds)
    .in("review_sections.key", ["course_metadata", "review_matrix", "syllabus_review"]);

  if (error) return new Map();

  const defaultSection = (): SectionProgress => ({ exists: false, status: null, responseData: null });
  const map = new Map<string, ReviewProgress>(
    courseIds.map((id) => [
      id,
      { courseMetadata: defaultSection(), reviewMatrix: defaultSection(), syllabusReview: defaultSection() },
    ])
  );

  for (const row of (data ?? []) as {
    course_id: string;
    status: "draft" | "submitted";
    response_data: Record<string, unknown>;
    review_sections: { key: string }[];
  }[]) {
    const progress = map.get(row.course_id);
    if (!progress) continue;
    const section: SectionProgress = { exists: true, status: row.status, responseData: row.response_data };
    const key = row.review_sections[0]?.key;
    if (key === "course_metadata") progress.courseMetadata = section;
    if (key === "review_matrix") progress.reviewMatrix = section;
    if (key === "syllabus_review") progress.syllabusReview = section;
  }

  return map;
}

export async function createCourse(input: CreateCourseInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles);

  const title = input.title.trim();

  if (!title) {
    throw new Error("Course title is required.");
  }

  const admin = getAdminClientOrThrow();
  const { data: course, error: courseError } = await admin
    .from("courses")
    .insert({
      source_course_id: cleanOptionalText(input.sourceCourseId),
      target_course_id: cleanOptionalText(input.targetCourseId),
      title,
      term: cleanOptionalText(input.term),
      department: cleanOptionalText(input.department),
      status: "course_created",
      created_by: context.profile.id
    })
    .select(
      "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at"
    )
    .single();

  if (courseError) {
    throw new Error(`Could not create course: ${courseError.message}`);
  }

  await insertStatusEvent({
    courseId: course.id,
    fromStatus: null,
    toStatus: "course_created",
    actor: context.profile,
    note: "Course created."
  });

  return toCourseSummary(course);
}

export async function assignUserToCourse(input: AssignUserToCourseInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles);

  if (!ROLES.includes(input.role)) {
    throw new Error(`Unsupported assignment role: ${input.role}`);
  }

  const admin = getAdminClientOrThrow();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.profileId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not verify assigned profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error("Assigned profile does not exist.");
  }

  const { error } = await admin.from("course_assignments").upsert(
    {
      course_id: input.courseId,
      profile_id: input.profileId,
      role: input.role,
      assigned_by: context.profile.id
    },
    {
      onConflict: "course_id,profile_id,role"
    }
  );

  if (error) {
    throw new Error(`Could not assign user to course: ${error.message}`);
  }
}

export async function transitionCourseStatus(input: TransitionCourseStatusInput) {
  const context = await requireProfile();

  if (!COURSE_STATUSES.includes(input.toStatus)) {
    throw new Error(`Unsupported target status: ${input.toStatus}`);
  }

  const admin = getAdminClientOrThrow();
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select(
      "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at"
    )
    .eq("id", input.courseId)
    .single();

  if (courseError) {
    throw new Error(`Could not load course: ${courseError.message}`);
  }

  const fromStatus = toCourseStatus(course.status);
  assertCanTransition({
    role: context.profile.role,
    from: fromStatus,
    to: input.toStatus
  });

  await assertCanActOnCourse({
    courseId: course.id,
    profile: context.profile
  });

  const { data: updatedCourse, error: updateError } = await admin
    .from("courses")
    .update({
      status: input.toStatus
    })
    .eq("id", course.id)
    .select(
      "id,source_course_id,target_course_id,title,term,department,status,created_by,created_at,updated_at"
    )
    .single();

  if (updateError) {
    throw new Error(`Could not update course status: ${updateError.message}`);
  }

  await insertStatusEvent({
    courseId: course.id,
    fromStatus,
    toStatus: input.toStatus,
    actor: context.profile,
    note: cleanOptionalText(input.note)
  });

  return toCourseSummary(updatedCourse);
}

async function assertCanActOnCourse({ courseId, profile }: { courseId: string; profile: AppProfile }) {
  if ((roleWideCourseRoles as readonly Role[]).includes(profile.role)) {
    return;
  }

  const admin = getAdminClientOrThrow();
  const { data, error } = await admin
    .from("course_assignments")
    .select("id")
    .eq("course_id", courseId)
    .eq("profile_id", profile.id)
    .eq("role", profile.role)
    .limit(1);

  if (error) {
    throw new Error(`Could not verify course assignment: ${error.message}`);
  }

  if (!data || data.length === 0) {
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
  const admin = getAdminClientOrThrow();
  const { error } = await admin.from("course_status_events").insert({
    course_id: courseId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_id: actor.id,
    actor_role: actor.role,
    note: cleanOptionalText(note)
  });

  if (error) {
    throw new Error(`Could not record course status event: ${error.message}`);
  }
}

function toCourseSummary(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    sourceCourseId: row.source_course_id,
    targetCourseId: row.target_course_id,
    title: row.title,
    term: row.term,
    department: row.department,
    status: toCourseStatus(row.status),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toCourseStatus(value: string): CourseStatus {
  if (!COURSE_STATUSES.includes(value as CourseStatus)) {
    throw new Error(`Unsupported course status: ${value}`);
  }

  return value as CourseStatus;
}

function cleanOptionalText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function getAdminClientOrThrow() {
  const admin = createAdminClient();

  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return admin;
}
