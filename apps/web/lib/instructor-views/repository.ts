import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import { isPostgresProvider } from "@/lib/repositories/provider";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";

/**
 * Upsert a view. First call creates the row; later calls bump last_opened_at
 * and open_count without touching first_opened_at — that's the value the
 * "opened {relative time}" tooltip in the indicator reads.
 */
export async function recordView(input: {
  courseId: string;
  profileId: string;
}): Promise<void> {
  if (isPostgresProvider()) {
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
    return;
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { error } = await admin.rpc("record_instructor_dashboard_view", {
    p_course_id: input.courseId,
    p_profile_id: input.profileId,
  });

  // No RPC defined yet — fall back to a two-step upsert via the service role.
  // Supabase doesn't expose ON CONFLICT DO UPDATE through the JS client cleanly,
  // so we mimic it with select-then-update/insert. Race-safe enough for our
  // single-instructor-per-course access pattern.
  if (error && error.code === "42883") {
    const { data: existing } = await admin
      .from("instructor_dashboard_views")
      .select("open_count")
      .eq("course_id", input.courseId)
      .eq("profile_id", input.profileId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("instructor_dashboard_views")
        .update({
          last_opened_at: new Date().toISOString(),
          open_count: (existing.open_count ?? 0) + 1,
        })
        .eq("course_id", input.courseId)
        .eq("profile_id", input.profileId);
    } else {
      await admin.from("instructor_dashboard_views").insert({
        course_id: input.courseId,
        profile_id: input.profileId,
      });
    }
    return;
  }

  if (error) {
    throw new Error(`Failed to record instructor dashboard view: ${error.message}`);
  }
}

type ViewRow = {
  course_id: string;
  first_opened_at: string;
  last_opened_at: string;
};

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

  if (isPostgresProvider()) {
    const pool = getPostgresPool();
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
    return result;
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("instructor_dashboard_views")
    .select("course_id, first_opened_at")
    .in("course_id", courseIds as string[]);

  if (error) {
    throw new Error(`Failed to batch instructor dashboard views: ${error.message}`);
  }

  for (const row of (data ?? []) as ViewRow[]) {
    const prev = result.get(row.course_id);
    if (!prev || new Date(row.first_opened_at) < new Date(prev)) {
      result.set(row.course_id, row.first_opened_at);
    }
  }
  return result;
}

/** Single-course lookup — earliest first-open + most recent last-open. */
export async function viewForCourse(
  courseId: string,
): Promise<{ firstOpenedAt: string; lastOpenedAt: string } | null> {
  if (isPostgresProvider()) {
    const pool = getPostgresPool();
    const { rows } = await pool.query<{ first_opened_at: string; last_opened_at: string }>(
      `
        SELECT min(first_opened_at) AS first_opened_at,
               max(last_opened_at)  AS last_opened_at
        FROM instructor_dashboard_views
        WHERE course_id = $1
      `,
      [courseId],
    );
    const row = rows[0];
    if (!row || !row.first_opened_at) return null;
    return { firstOpenedAt: row.first_opened_at, lastOpenedAt: row.last_opened_at };
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("instructor_dashboard_views")
    .select("first_opened_at, last_opened_at")
    .eq("course_id", courseId);

  if (error) {
    throw new Error(`Failed to load instructor dashboard view: ${error.message}`);
  }
  const rows = (data ?? []) as ViewRow[];
  if (rows.length === 0) return null;
  const firstOpenedAt = rows
    .map((r) => r.first_opened_at)
    .reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
  const lastOpenedAt = rows
    .map((r) => r.last_opened_at)
    .reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));
  return { firstOpenedAt, lastOpenedAt };
}
