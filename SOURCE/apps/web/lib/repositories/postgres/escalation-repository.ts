import "server-only";

import type {
  CourseEscalation,
  CreateEscalationInput,
  EscalationMessage,
  EscalationRepository,
  EscalationWithMessages,
  OpenEscalationRow,
} from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";

type IssueRow = {
  id: string;
  course_id: string;
  created_by: string;
  severity: string;
  title: string;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
};

type IssueCommentRow = {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  is_system_message: boolean;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
};

function mapComment(row: IssueCommentRow): EscalationMessage {
  return {
    id: row.id,
    escalation_id: row.issue_id,
    author_id: row.author_id,
    author_name: row.author_name ?? undefined,
    author_email: row.author_email ?? undefined,
    body: row.body,
    created_at: row.created_at,
  };
}

function mapIssue(row: IssueRow, messages: EscalationMessage[], resolutionNote?: string | null): EscalationWithMessages {
  return {
    id: row.id,
    course_id: row.course_id,
    created_by: row.created_by,
    severity: row.severity as CourseEscalation["severity"],
    title: row.title,
    status: row.status as CourseEscalation["status"],
    resolved_by: row.resolved_by,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
    author_name: row.author_name ?? undefined,
    author_email: row.author_email ?? undefined,
    resolutionNote: resolutionNote ?? null,
    messages,
  };
}

export function createPostgresEscalationRepository(): EscalationRepository {
  return {
    async getEscalationsForCourse(courseId) {
      const pool = getPostgresPool();
      const issuesResult = await pool.query<IssueRow>(
        `
          SELECT
            i.id,
            i.course_id,
            i.created_by,
            i.severity,
            i.title,
            i.status,
            i.resolved_by,
            i.resolved_at,
            i.created_at,
            p.full_name AS author_name,
            p.email AS author_email
          FROM course_issues i
          LEFT JOIN profiles p ON p.id = i.created_by
          WHERE i.course_id = $1 AND i.type = 'escalation'
          ORDER BY i.created_at DESC
        `,
        [courseId],
      );

      const issueIds = issuesResult.rows.map((row) => row.id);
      let commentsByIssue = new Map<string, IssueCommentRow[]>();

      if (issueIds.length > 0) {
        const commentsResult = await pool.query<IssueCommentRow>(
          `
            SELECT
              c.id,
              c.issue_id,
              c.author_id,
              c.body,
              c.is_system_message,
              c.created_at,
              p.full_name AS author_name,
              p.email AS author_email
            FROM course_issue_comments c
            LEFT JOIN profiles p ON p.id = c.author_id
            WHERE c.issue_id = ANY($1::uuid[])
            ORDER BY c.created_at ASC
          `,
          [issueIds],
        );

        commentsByIssue = commentsResult.rows.reduce((acc, row) => {
          const list = acc.get(row.issue_id) ?? [];
          list.push(row);
          acc.set(row.issue_id, list);
          return acc;
        }, new Map<string, IssueCommentRow[]>());
      }

      return issuesResult.rows.map((issue) => {
        const allComments = commentsByIssue.get(issue.id) ?? [];
        const userMessages = allComments
          .filter((comment) => !comment.is_system_message)
          .map(mapComment)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const latestSystemNote = [...allComments]
          .filter((comment) => comment.is_system_message)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

        return mapIssue(issue, userMessages, latestSystemNote?.body ?? null);
      });
    },

    async getOpenEscalations() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{
        id: string;
        course_id: string;
        created_by: string;
        severity: string;
        title: string;
        status: string;
        resolved_by: string | null;
        resolved_at: string | null;
        created_at: string;
        author_name: string | null;
        author_email: string | null;
        course_title: string | null;
        course_source_id: string | null;
        latest_message: string | null;
        latest_message_at: string | null;
      }>(
        `
          SELECT
            i.id,
            i.course_id,
            i.created_by,
            i.severity,
            i.title,
            i.status,
            i.resolved_by,
            i.resolved_at,
            i.created_at,
            p.full_name AS author_name,
            p.email AS author_email,
            c.title AS course_title,
            c.source_course_id AS course_source_id,
            latest.body AS latest_message,
            latest.created_at AS latest_message_at
          FROM course_issues i
          LEFT JOIN profiles p ON p.id = i.created_by
          LEFT JOIN courses c ON c.id = i.course_id
          LEFT JOIN LATERAL (
            SELECT body, created_at
            FROM course_issue_comments cic
            WHERE cic.issue_id = i.id
            ORDER BY cic.created_at DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE i.type = 'escalation' AND i.status = 'open'
          ORDER BY i.created_at ASC
        `,
      );

      return rows.map((row) => ({
        id: row.id,
        course_id: row.course_id,
        created_by: row.created_by,
        severity: row.severity as CourseEscalation["severity"],
        title: row.title,
        status: row.status as CourseEscalation["status"],
        resolved_by: row.resolved_by,
        resolved_at: row.resolved_at,
        created_at: row.created_at,
        author_name: row.author_name ?? undefined,
        author_email: row.author_email ?? undefined,
        course_title: row.course_title ?? "",
        course_source_id: row.course_source_id,
        latest_message: row.latest_message,
        latest_message_at: row.latest_message_at,
      }) satisfies OpenEscalationRow);
    },

    async createEscalation(input: CreateEscalationInput) {
      const pool = getPostgresPool();
      const issueResult = await pool.query<IssueRow>(
        `
          WITH inserted AS (
            INSERT INTO course_issues (course_id, created_by, severity, title, type, phase, status)
            VALUES ($1, $2, $3, $4, 'escalation', 'migration', 'open')
            RETURNING id, course_id, created_by, severity, title, status, resolved_by, resolved_at, created_at
          )
          SELECT
            i.id,
            i.course_id,
            i.created_by,
            i.severity,
            i.title,
            i.status,
            i.resolved_by,
            i.resolved_at,
            i.created_at,
            p.full_name AS author_name,
            p.email AS author_email
          FROM inserted i
          LEFT JOIN profiles p ON p.id = i.created_by
        `,
        [input.courseId, input.createdBy, input.severity, input.title],
      );

      const issue = issueResult.rows[0];

      const commentResult = await pool.query<IssueCommentRow>(
        `
          WITH inserted AS (
            INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
            VALUES ($1, $2, $3, false)
            RETURNING id, issue_id, author_id, body, is_system_message, created_at
          )
          SELECT
            c.id,
            c.issue_id,
            c.author_id,
            c.body,
            c.is_system_message,
            c.created_at,
            p.full_name AS author_name,
            p.email AS author_email
          FROM inserted c
          LEFT JOIN profiles p ON p.id = c.author_id
        `,
        [issue.id, input.createdBy, input.firstMessage],
      );

      return mapIssue(issue, [mapComment(commentResult.rows[0])]);
    },

    async addMessage(escalationId, authorId, body) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<IssueCommentRow>(
        `
          WITH inserted AS (
            INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
            VALUES ($1, $2, $3, false)
            RETURNING id, issue_id, author_id, body, is_system_message, created_at
          )
          SELECT
            c.id,
            c.issue_id,
            c.author_id,
            c.body,
            c.is_system_message,
            c.created_at,
            p.full_name AS author_name,
            p.email AS author_email
          FROM inserted c
          LEFT JOIN profiles p ON p.id = c.author_id
        `,
        [escalationId, authorId, body],
      );

      return mapComment(rows[0]);
    },

    async resolveEscalation(escalationId, resolvedBy, resolutionNote) {
      const pool = getPostgresPool();
      await pool.query(
        `
          UPDATE course_issues
          SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
          WHERE id = $1
        `,
        [escalationId, resolvedBy],
      );

      if (resolutionNote?.trim()) {
        await pool.query(
          `
            INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
            VALUES ($1, $2, $3, true)
          `,
          [escalationId, resolvedBy, resolutionNote.trim()],
        );
      }
    },

    async countOpenEscalations() {
      const pool = getPostgresPool();
      const { rows } = await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM course_issues
          WHERE type = 'escalation' AND status = 'open'
        `,
      );

      return Number(rows[0]?.count ?? "0");
    },
  };
}
