import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import type {
  InstructorEmailProvider,
  InstructorEmailRow,
  InstructorEmailStatus,
} from "./types";

type DbRow = {
  id: string;
  course_id: string;
  sent_by: string;
  recipient: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: InstructorEmailStatus;
  provider: InstructorEmailProvider | null;
  provider_message_id: string | null;
  send_error: string | null;
  sent_at: string | null;
  created_at: string;
  sent_by_name?: string | null;
};

function mapRow(row: DbRow): InstructorEmailRow {
  return {
    id: row.id,
    courseId: row.course_id,
    sentBy: row.sent_by,
    recipient: row.recipient,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    sendError: row.send_error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    sentByName: row.sent_by_name ?? null,
  };
}

/** All sends for a course, newest first. Joins sender name for display. */
export async function listByCourse(courseId: string): Promise<InstructorEmailRow[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<DbRow>(
    `
      SELECT e.id, e.course_id, e.sent_by, e.recipient, e.subject,
             e.body_html, e.body_text, e.status, e.provider,
             e.provider_message_id, e.send_error, e.sent_at, e.created_at,
             p.full_name AS sent_by_name
      FROM instructor_emails e
      LEFT JOIN profiles p ON p.id = e.sent_by
      WHERE e.course_id = $1
      ORDER BY e.created_at DESC
    `,
    [courseId],
  );
  return rows.map(mapRow);
}

/** Most recent send for a course (any status), or null when none. */
export async function lastForCourse(
  courseId: string,
): Promise<InstructorEmailRow | null> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<DbRow>(
    `
      SELECT id, course_id, sent_by, recipient, subject,
             body_html, body_text, status, provider,
             provider_message_id, send_error, sent_at, created_at
      FROM instructor_emails
      WHERE course_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [courseId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}
