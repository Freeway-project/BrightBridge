import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import type {
  InstructorEmailProvider,
  NewInstructorEmail,
} from "./types";

/**
 * Inserts a new send attempt with status='pending' and returns its id. The
 * caller is responsible for following up with markSent / markFailed once the
 * provider call returns.
 */
export async function insertPending(input: NewInstructorEmail): Promise<string> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ id: string }>(
    `
      INSERT INTO instructor_emails
        (course_id, sent_by, recipient, subject, body_html, body_text, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id
    `,
    [
      input.courseId,
      input.sentBy,
      input.recipient,
      input.subject,
      input.bodyHtml,
      input.bodyText,
    ],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error("Failed to insert instructor email — no id returned.");
  }
  return id;
}

export async function markSent(
  id: string,
  args: { provider: InstructorEmailProvider; providerMessageId?: string },
): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `
      UPDATE instructor_emails
      SET status = 'sent',
          provider = $2,
          provider_message_id = $3,
          sent_at = now(),
          send_error = NULL
      WHERE id = $1
    `,
    [id, args.provider, args.providerMessageId ?? null],
  );
}

export async function markFailed(
  id: string,
  args: { provider: InstructorEmailProvider | null; error: string },
): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `
      UPDATE instructor_emails
      SET status = 'failed',
          provider = $2,
          send_error = $3
      WHERE id = $1
    `,
    [id, args.provider, args.error],
  );
}
