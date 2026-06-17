import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";

/**
 * Upsert a view. First call creates the row; later calls bump last_opened_at
 * and open_count without touching first_opened_at — that's the value the
 * "opened {relative time}" tooltip in the indicator reads.
 */
export async function recordView(input: {
  courseId: string;
  profileId: string;
}): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `
      INSERT INTO instructor_dashboard_views (course_id, profile_id)
      VALUES ($1, $2)
      ON CONFLICT (course_id, profile_id) DO UPDATE
        SET last_opened_at = now(),
            open_count = instructor_dashboard_views.open_count + 1
    `,
    [input.courseId, input.profileId],
  );
}

/**
 * Earliest first-open per course across any instructor profile. Returns a Map
 * keyed by courseId; absent keys = never opened. Used by list surfaces (admin
 * table, comms queue) to render the indicator without N+1 lookups.
 */
export async function firstOpenedAtByCourseIds(
  courseIds: readonly string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (courseIds.length === 0) return result;

  const pool = getPostgresPool();
  try {
    const { rows } = await pool.query<{ course_id: string; first_opened_at: string }>(
      `
        SELECT course_id, min(first_opened_at) AS first_opened_at
        FROM instructor_dashboard_views
        WHERE course_id = ANY($1::uuid[])
        GROUP BY course_id
      `,
      [courseIds as string[]],
    );
    for (const row of rows) result.set(row.course_id, row.first_opened_at);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : null;
    if (code !== "42P01") {
      console.warn("[firstOpenedAtByCourseIds] query failed:", (error as Error).message);
    }
  }
  return result;
}

/** Single-course lookup — earliest first-open + most recent last-open. */
export async function viewForCourse(
  courseId: string,
): Promise<{ firstOpenedAt: string; lastOpenedAt: string } | null> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ first_opened_at: string | null; last_opened_at: string | null }>(
    `
      SELECT min(first_opened_at) AS first_opened_at,
             max(last_opened_at)  AS last_opened_at
      FROM instructor_dashboard_views
      WHERE course_id = $1
    `,
    [courseId],
  );
  const row = rows[0];
  if (!row || !row.first_opened_at || !row.last_opened_at) return null;
  return { firstOpenedAt: row.first_opened_at, lastOpenedAt: row.last_opened_at };
}
