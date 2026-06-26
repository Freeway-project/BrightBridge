import "server-only";

import type { CommentRepository } from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";

type CommentRow = {
  id: string;
  course_id: string;
  author_id: string;
  body: string;
  visibility: "internal" | "instructor_visible";
  parent_comment_id: string | null;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
  author_role: string | null;
  acting_on_behalf_of: string | null;
  is_question: boolean;
  is_answered: boolean;
};

export function createPostgresCommentRepository(): CommentRepository {
  return {
    async listCourseComments(courseId, visibility) {
      const pool = getPostgresPool();
      const where = visibility
        ? "WHERE c.course_id = $1 AND c.visibility = $2"
        : "WHERE c.course_id = $1";
      const params = visibility ? [courseId, visibility] : [courseId];
      const { rows } = await pool.query<CommentRow>(
        `
          SELECT
            c.id,
            c.course_id,
            c.author_id,
            c.body,
            c.visibility,
            c.parent_comment_id,
            c.created_at,
            c.acting_on_behalf_of,
            c.is_question,
            c.is_answered,
            p.full_name  AS author_name,
            p.email      AS author_email,
            p.role       AS author_role
          FROM course_comments c
          LEFT JOIN profiles p ON p.id = c.author_id
          ${where}
          ORDER BY c.created_at ASC
        `,
        params,
      );

      return rows.map((row) => ({
        ...row,
        author_name:  row.author_name  ?? undefined,
        author_email: row.author_email ?? undefined,
        author_role:  row.author_role  ?? undefined,
      }));
    },

    async postCourseComment(input) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CommentRow>(
        `
          WITH inserted AS (
            INSERT INTO course_comments (
              course_id, author_id, body, visibility,
              parent_comment_id, acting_on_behalf_of, is_question
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
              id, course_id, author_id, body, visibility,
              parent_comment_id, created_at, acting_on_behalf_of,
              is_question, is_answered
          )
          SELECT
            i.id, i.course_id, i.author_id, i.body, i.visibility,
            i.parent_comment_id, i.created_at, i.acting_on_behalf_of,
            i.is_question, i.is_answered,
            p.full_name AS author_name,
            p.email     AS author_email,
            p.role      AS author_role
          FROM inserted i
          LEFT JOIN profiles p ON p.id = i.author_id
        `,
        [
          input.courseId,
          input.authorId,
          input.body,
          input.visibility ?? "internal",
          input.parentCommentId ?? null,
          input.actingOnBehalfOf ?? null,
          input.isQuestion ?? false,
        ],
      );

      const row = rows[0];
      return {
        ...row,
        author_name:  row.author_name  ?? undefined,
        author_email: row.author_email ?? undefined,
        author_role:  row.author_role  ?? undefined,
      };
    },

    async markCommentAnswered(commentId) {
      const pool = getPostgresPool();
      await pool.query(
        `UPDATE course_comments SET is_answered = true WHERE id = $1`,
        [commentId],
      );
    },
  };
}
