import "server-only";
import { isAdminOverride, type CourseStatus, type Role } from "@coursebridge/workflow";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_REASON_LEN = 10;

export type OverrideInput = {
  courseId: string;
  to: CourseStatus;
  reason: string;
  actorId: string;
  actorRole: Role;
};

export async function overrideCourseStatus(client: SupabaseClient, input: OverrideInput) {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LEN) {
    throw new Error(`reason must be at least ${MIN_REASON_LEN} characters`);
  }

  const { data: course, error: readErr } = await client
    .from("courses")
    .select("status")
    .eq("id", input.courseId)
    .single();
  if (readErr) throw readErr;
  if (!course) throw new Error(`course ${input.courseId} not found`);

  const from = course.status as CourseStatus;

  // Check same-status BEFORE isAdminOverride (which also returns false for from===to)
  // so the user gets the "already" message, not the generic "Forbidden" message.
  if (from === input.to) {
    throw new Error("Course is already in that status");
  }

  if (!isAdminOverride({ role: input.actorRole, from, to: input.to })) {
    throw new Error("Forbidden: role cannot override status, or target equals current");
  }

  const { error: insertErr } = await client.from("course_status_events").insert({
    course_id: input.courseId,
    from_status: from,
    to_status: input.to,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    note: reason,
    kind: "admin_override",
  });
  if (insertErr) throw insertErr;

  const { error: updateErr } = await client
    .from("courses")
    .update({ status: input.to })
    .eq("id", input.courseId);
  if (updateErr) throw updateErr;
}
