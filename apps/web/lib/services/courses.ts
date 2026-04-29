import "server-only";

import { assertCanTransition, type CourseStatus } from "@coursebridge/workflow";
import type { Role } from "@coursebridge/workflow";
import { createAdminClient } from "@/lib/supabase/admin";

export type CourseRow = {
  id: string;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  created_at: string;
};

function admin() {
  const client = createAdminClient();
  if (!client) throw new Error("Admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY.");
  return client;
}

export async function getAssignedCourses(userId: string): Promise<CourseRow[]> {
  const { data, error } = await admin()
    .from("courses")
    .select("id, title, term, department, status, created_at, course_assignments!inner(profile_id)")
    .eq("course_assignments.profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAssignedCourses: ${error.message}`);
  return (data ?? []) as CourseRow[];
}

export async function getCourseById(
  courseId: string,
  userId: string,
): Promise<CourseRow | null> {
  const { data, error } = await admin()
    .from("courses")
    .select("id, title, term, department, status, created_at, course_assignments!inner(profile_id)")
    .eq("id", courseId)
    .eq("course_assignments.profile_id", userId)
    .maybeSingle();

  if (error) throw new Error(`getCourseById: ${error.message}`);
  return data as CourseRow | null;
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

  const db = admin();

  const { error: updateError } = await db
    .from("courses")
    .update({ status: to })
    .eq("id", courseId);

  if (updateError) throw new Error(`transitionCourseStatus update: ${updateError.message}`);

  const { error: eventError } = await db.from("course_status_events").insert({
    course_id: courseId,
    from_status: from,
    to_status: to,
    actor_id: actorId,
    actor_role: actorRole,
    note: note ?? null,
  });

  if (eventError) throw new Error(`transitionCourseStatus event: ${eventError.message}`);
}
