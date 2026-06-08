import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import { isPostgresProvider } from "@/lib/repositories/provider";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
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
  if (isPostgresProvider()) {
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

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("instructor_emails")
    .select(
      "id, course_id, sent_by, recipient, subject, body_html, body_text, status, provider, provider_message_id, send_error, sent_at, created_at, sender:sent_by ( full_name )",
    )
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load instructor emails: ${error.message}`);
  }

  return (data ?? []).map((row: any) => {
    const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    return mapRow({ ...row, sent_by_name: sender?.full_name ?? null });
  });
}

/** Most recent send for a course (any status), or null when none. */
export async function lastForCourse(
  courseId: string,
): Promise<InstructorEmailRow | null> {
  if (isPostgresProvider()) {
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

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("instructor_emails")
    .select(
      "id, course_id, sent_by, recipient, subject, body_html, body_text, status, provider, provider_message_id, send_error, sent_at, created_at",
    )
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load last instructor email: ${error.message}`);
  }

  return data ? mapRow(data as DbRow) : null;
}
