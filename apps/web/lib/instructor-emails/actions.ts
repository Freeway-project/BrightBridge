"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole, requireProfile } from "@/lib/auth/context";
import { getAdminCourseDetail } from "@/lib/admin/queries";
import {
  createReviewInvite,
  getCourseInstructorRecipients,
} from "@/lib/invites/service";
import { buildInviteLink } from "@/lib/email/templates/instructor-invite";
import { lastForCourse } from "./queries";
import { notifyInstructor } from "./service";

/**
 * Sends the "course is ready" email to every assigned instructor for the
 * course and logs each attempt to `instructor_emails`. Used for both the
 * first send and (via resendInstructorEmailAction) re-sends.
 *
 * Best-effort per-recipient: a failed send to one instructor is logged but
 * doesn't abort the others. Returns the number of attempted/sent recipients.
 *
 * NOTE: the "dashboard URL" is the invite token URL from lib/invites/service.ts.
 */
async function dispatchToAllInstructors(input: {
  courseId: string;
  sentBy: string;
}): Promise<{ attempted: number; sent: number; failed: number }> {
  const detail = await getAdminCourseDetail(input.courseId);
  const courseTitle = detail?.course.title ?? "your migrated course";
  const recipients = await getCourseInstructorRecipients(input.courseId);

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const { token } = await createReviewInvite({
        courseId: input.courseId,
        email: recipient.email,
        createdBy: input.sentBy,
      });
      const dashboardUrl = buildInviteLink(token);

      await notifyInstructor({
        courseId: input.courseId,
        sentBy: input.sentBy,
        recipient: recipient.email,
        instructorName: recipient.fullName,
        courseTitle,
        dashboardUrl,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[instructor-emails] Failed to notify ${recipient.email} for course ${input.courseId}:`,
        error,
      );
    }
  }

  return { attempted: recipients.length, sent, failed };
}

export async function notifyInstructorAction(courseId: string): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);
  await dispatchToAllInstructors({ courseId, sentBy: ctx.userId });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/emails`);
}

/**
 * Resend is allowed ONLY when the most recent send for the course is in the
 * `failed` state — otherwise the admin would be duplicating a successful
 * delivery (or stomping on a still-pending one). The UI also gates this, but
 * we enforce server-side because the action is exported.
 */
export async function resendInstructorEmailAction(
  courseId: string,
): Promise<void> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);

  const last = await lastForCourse(courseId);
  if (!last) {
    throw new Error("No previous send to resend — use the initial send action.");
  }
  if (last.status !== "failed") {
    throw new Error(
      `Resend is only available after a failed send (last send: ${last.status}).`,
    );
  }

  await dispatchToAllInstructors({ courseId, sentBy: ctx.userId });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/emails`);
}
