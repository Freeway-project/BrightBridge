import "server-only";

export type CourseReadyForInstructorTemplateInput = {
  /** Instructor display name; falls back to a generic greeting if empty. */
  instructorName: string | null;
  courseTitle: string;
  /**
   * URL the instructor opens from the email.
   *
   * Caller-supplied — the template is auth-agnostic. Callers pass the
   * single-use invite token URL (lib/invites/service.ts::buildInviteLink).
   */
  dashboardUrl: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the "course is ready for your review" email sent to an instructor
 * when an admin hands off a finalized staging shell. Plain string templating
 * on purpose — no React, no MJML — so the same module works in any Node
 * runtime the email provider lambdas might run in.
 */
export function render(
  input: CourseReadyForInstructorTemplateInput,
): RenderedEmail {
  const greetingName = input.instructorName?.trim() || "there";
  const subject = `Your course review is ready: ${input.courseTitle}`;

  const text = [
    `Hi ${greetingName},`,
    "",
    `Your migrated course "${input.courseTitle}" is ready for your review on CourseBridge.`,
    "",
    "Open your review dashboard here:",
    input.dashboardUrl,
    "",
    "If you did not expect this email, you can safely ignore it.",
  ].join("\n");

  const safeName = escapeHtml(greetingName);
  const safeTitle = escapeHtml(input.courseTitle);
  // dashboardUrl is rendered into an href and as link text. We escape it for
  // safety even though it's server-generated; we never trust string inputs in
  // HTML contexts.
  const safeUrl = escapeHtml(input.dashboardUrl);

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="font-size: 18px; margin-bottom: 8px;">Your course review is ready</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Hi ${safeName}, your migrated course <strong>${safeTitle}</strong> is ready for your review on CourseBridge.
      </p>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}"
           style="background: #d97706; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
          Open my review dashboard
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
        If the button doesn't work, copy this link into your browser:<br />
        <a href="${safeUrl}" style="color: #d97706;">${safeUrl}</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
        If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  return { subject, html, text };
}
