import "server-only";

import {
  createReviewInvite,
  getCourseInstructorRecipients,
} from "@/lib/invites/service";
import { buildInviteLink, sendInstructorInviteEmail } from "@/lib/email/templates/instructor-invite";

export type InviteSendResult = {
  attempted: number;
  sent: number;
  recipients: string[];
};

/**
 * Generates a fresh magic-link invite for every instructor assigned to the
 * course and emails it. Best-effort: per-recipient failures are logged and do
 * not abort the others, so a delivery problem never blocks the workflow. Safe
 * to call when no instructor is assigned (returns attempted: 0).
 */
export async function issueInstructorInvites(input: {
  courseId: string;
  courseTitle: string;
  createdBy: string;
}): Promise<InviteSendResult> {
  const recipients = await getCourseInstructorRecipients(input.courseId);
  let sent = 0;

  for (const recipient of recipients) {
    try {
      const { token } = await createReviewInvite({
        courseId: input.courseId,
        email: recipient.email,
        createdBy: input.createdBy,
        neverExpires: true,
      });
      await sendInstructorInviteEmail({
        to: recipient.email,
        courseTitle: input.courseTitle,
        link: buildInviteLink(token),
      });
      sent += 1;
    } catch (error) {
      console.error(
        `[invites] Failed to send instructor invite for course ${input.courseId} to ${recipient.email}:`,
        error,
      );
    }
  }

  return { attempted: recipients.length, sent, recipients: recipients.map((r) => r.email) };
}
