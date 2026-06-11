import "server-only";

import { sendEmail } from "@/lib/email/service";
import { EmailSendError } from "@/lib/email/types";
import { render } from "@/lib/email/templates/course-ready-for-instructor";
import { insertPending, markFailed, markSent } from "./repository";
import type { InstructorEmailRow } from "./types";

export type NotifyInstructorInput = {
  courseId: string;
  sentBy: string;
  recipient: string;
  /** Used in the email body (greeting). */
  instructorName?: string | null;
  courseTitle: string;
  dashboardUrl: string;
};

export type NotifyInstructorResult = Pick<
  InstructorEmailRow,
  "id" | "status" | "provider" | "providerMessageId" | "sendError"
>;

/**
 * End-to-end "tell the instructor their course is ready" flow:
 *   1. Render template
 *   2. Persist a `pending` row (so the Emails tab can always show *something*
 *      even if the provider call hangs or the process dies)
 *   3. Send via the provider, then mark the row sent or failed accordingly
 *
 * Rethrows on provider failure so the caller can decide whether to surface
 * the error or swallow it (the existing `emailInstructorInvites` wrapper
 * swallows so it can't roll back a status transition).
 */
export async function notifyInstructor(
  input: NotifyInstructorInput,
): Promise<NotifyInstructorResult> {
  const { subject, html, text } = render({
    instructorName: input.instructorName ?? null,
    courseTitle: input.courseTitle,
    dashboardUrl: input.dashboardUrl,
  });

  const id = await insertPending({
    courseId: input.courseId,
    sentBy: input.sentBy,
    recipient: input.recipient,
    subject,
    bodyHtml: html,
    bodyText: text,
  });

  try {
    const result = await sendEmail({
      to: input.recipient,
      subject,
      html,
      text,
    });
    await markSent(id, {
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    });
    return {
      id,
      status: "sent",
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      sendError: null,
    };
  } catch (err) {
    const provider = err instanceof EmailSendError ? err.provider : null;
    const message =
      err instanceof Error ? err.message : "Unknown email send failure.";
    await markFailed(id, { provider, error: message });
    throw err;
  }
}
