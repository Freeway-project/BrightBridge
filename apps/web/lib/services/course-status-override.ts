import "server-only";
import { isAdminOverride, type CourseStatus, type Role } from "@coursebridge/workflow";
import { getPostgresPool } from "@/lib/postgres/pool";

const MIN_REASON_LEN = 10;

export type OverrideInput = {
  courseId: string;
  to: CourseStatus;
  reason: string;
  actorId: string;
  actorRole: Role;
};

export async function overrideCourseStatus(input: OverrideInput) {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LEN) {
    throw new Error(`reason must be at least ${MIN_REASON_LEN} characters`);
  }

  const pool = getPostgresPool();

  const { rows } = await pool.query<{ status: string }>(
    "SELECT status FROM courses WHERE id = $1",
    [input.courseId],
  );
  if (rows.length === 0) throw new Error(`course ${input.courseId} not found`);

  const from = rows[0].status as CourseStatus;

  // Check same-status BEFORE isAdminOverride (which also returns false for from===to)
  // so the user gets the "already" message, not the generic "Forbidden" message.
  if (from === input.to) {
    throw new Error("Course is already in that status");
  }

  if (!isAdminOverride({ role: input.actorRole, from, to: input.to })) {
    throw new Error("Forbidden: role cannot override status, or target equals current");
  }

  await pool.query(
    `INSERT INTO course_status_events
       (course_id, from_status, to_status, actor_id, actor_role, note, kind)
     VALUES ($1, $2, $3, $4, $5, $6, 'admin_override')`,
    [input.courseId, from, input.to, input.actorId, input.actorRole, reason],
  );

  await pool.query(
    "UPDATE courses SET status = $1 WHERE id = $2",
    [input.to, input.courseId],
  );
}
