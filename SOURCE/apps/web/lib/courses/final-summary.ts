import "server-only";

import { getCourseRepository } from "@/lib/repositories";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";
import type { CourseStatus, Role } from "@coursebridge/workflow";

/** Statuses during which the TA may author the Final Summary for Instructor. */
const SUMMARY_EDITABLE_STATUSES: readonly CourseStatus[] = ["waiting_on_admin", "staging_in_progress"];
const ADMIN_ROLES: readonly Role[] = ["admin_full", "admin_viewer", "super_admin"];
const MAX_SUMMARY_LENGTH = 5000;

export async function getFinalSummaryNotes(courseId: string): Promise<string | null> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ instructor_summary_notes: string | null }>(
    `SELECT instructor_summary_notes FROM courses WHERE id = $1 LIMIT 1`,
    [courseId],
  );
  return rows[0]?.instructor_summary_notes ?? null;
}

/**
 * Saves the TA-authored "Final Summary for Instructor". Allowed for the assigned
 * TA (or any admin) only while the course is in the staging window
 * (waiting_on_admin / staging_in_progress).
 */
export async function saveFinalSummaryNotes(courseId: string, notes: string): Promise<void> {
  const context = await requireProfile();
  const role = context.profile.role;

  if (notes.length > MAX_SUMMARY_LENGTH) {
    throw new Error(`Final summary must be ${MAX_SUMMARY_LENGTH} characters or less.`);
  }

  const repo = getCourseRepository();
  const course = await repo.getCourseSummaryById(courseId);

  if (!SUMMARY_EDITABLE_STATUSES.includes(course.status)) {
    throw new Error("The final summary can only be edited while the course is in staging.");
  }

  const isAdmin = ADMIN_ROLES.includes(role);
  if (!isAdmin) {
    const isAssignedStaff = await repo.hasAssignment(courseId, context.profile.id, "staff");
    if (!isAssignedStaff) {
      throw new Error("Only the assigned TA or an admin can edit the final summary.");
    }
  }

  const trimmed = notes.trim();
  const value = trimmed.length ? trimmed : null;

  const pool = getPostgresPool();
  await pool.query(`UPDATE courses SET instructor_summary_notes = $2 WHERE id = $1`, [courseId, value]);
}
