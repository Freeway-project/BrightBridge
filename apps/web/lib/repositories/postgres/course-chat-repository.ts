import { getPostgresPool } from "@/lib/postgres/pool";
import type {
  AccessibleCourseScope,
  CourseChatInboxItem,
  CourseChatRepository,
} from "@/lib/repositories/contracts";

type InboxRow = {
  course_id: string;
  course_title: string;
  last_activity_at: string | Date;
  last_preview: string | null;
  last_author_name: string | null;
  unanswered_count: number;
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Builds the `AND EXISTS (...)` course-scope predicate, mirroring
 * course-repository's buildAccessibleWhere. Returns an empty string (all
 * courses) for the `all` scope. For the `assigned` scope it appends the
 * profileId + role to `params` and references them by their 1-based position.
 */
function scopePredicate(scope: AccessibleCourseScope, params: unknown[]): string {
  if (scope.kind !== "assigned") return "";
  params.push(scope.profileId, scope.role);
  return `AND EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id AND ca.profile_id = $${params.length - 1} AND ca.role = $${params.length})`;
}

export function createPostgresCourseChatRepository(): CourseChatRepository {
  return {
    async listCourseChatInbox(scope) {
      const pool = getPostgresPool();
      const params: unknown[] = [];
      const predicate = scopePredicate(scope, params);
      const { rows } = await pool.query<InboxRow>(
        `
          SELECT
            c.id           AS course_id,
            c.title        AS course_title,
            agg.last_activity_at,
            agg.unanswered_count,
            lm.body        AS last_preview,
            lm.author_name AS last_author_name
          FROM courses c
          JOIN (
            SELECT
              course_id,
              MAX(created_at) AS last_activity_at,
              COUNT(*) FILTER (WHERE is_question AND NOT is_answered)::int AS unanswered_count
            FROM course_comments
            WHERE visibility = 'instructor_visible'
            GROUP BY course_id
          ) agg ON agg.course_id = c.id
          LEFT JOIN LATERAL (
            SELECT co.body, p.full_name AS author_name
            FROM course_comments co
            LEFT JOIN profiles p ON p.id = co.author_id
            WHERE co.course_id = c.id AND co.visibility = 'instructor_visible'
            ORDER BY co.created_at DESC
            LIMIT 1
          ) lm ON true
          WHERE TRUE ${predicate}
          ORDER BY agg.last_activity_at DESC
        `,
        params,
      );

      return rows.map((row) => ({
        courseId: row.course_id,
        courseTitle: row.course_title,
        lastActivityAt: toIso(row.last_activity_at),
        lastPreview: row.last_preview,
        lastAuthorName: row.last_author_name,
        unansweredCount: row.unanswered_count,
      }));
    },

    async isCourseAccessible(scope, courseId) {
      const pool = getPostgresPool();
      const params: unknown[] = [courseId];
      const predicate = scopePredicate(scope, params);
      const { rows } = await pool.query<{ ok: boolean }>(
        `SELECT TRUE AS ok FROM courses c WHERE c.id = $1 ${predicate} LIMIT 1`,
        params,
      );
      return rows.length > 0;
    },
  };
}
