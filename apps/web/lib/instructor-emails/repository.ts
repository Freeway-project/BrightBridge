import "server-only";

import { getPostgresPool } from "@/lib/postgres/pool";
import { isPostgresProvider } from "@/lib/repositories/provider";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
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
  if (isPostgresProvider()) {
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

  const admin = getSupabaseAdminClientOrThrow();
  const { data, error } = await admin
    .from("instructor_emails")
    .insert({
      course_id: input.courseId,
      sent_by: input.sentBy,
      recipient: input.recipient,
      subject: input.subject,
      body_html: input.bodyHtml,
      body_text: input.bodyText,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert instructor email: ${error?.message ?? "no row returned"}`);
  }
  return data.id as string;
}

export async function markSent(
  id: string,
  args: { provider: InstructorEmailProvider; providerMessageId?: string },
): Promise<void> {
  if (isPostgresProvider()) {
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
    return;
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { error } = await admin
    .from("instructor_emails")
    .update({
      status: "sent",
      provider: args.provider,
      provider_message_id: args.providerMessageId ?? null,
      sent_at: new Date().toISOString(),
      send_error: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark instructor email sent: ${error.message}`);
  }
}

export async function markFailed(
  id: string,
  args: { provider: InstructorEmailProvider | null; error: string },
): Promise<void> {
  if (isPostgresProvider()) {
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
    return;
  }

  const admin = getSupabaseAdminClientOrThrow();
  const { error } = await admin
    .from("instructor_emails")
    .update({
      status: "failed",
      provider: args.provider,
      send_error: args.error,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark instructor email failed: ${error.message}`);
  }
}
