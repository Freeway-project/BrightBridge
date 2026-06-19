import "server-only";

import { sendEmail } from "@/lib/email/client";

/** Production domain instructors receive their magic links on. */
const PRODUCTION_SITE_URL = "https://coursebridge.okanagancollege.app";

function resolveSiteUrl(): string {
  // In production, ALWAYS use the canonical domain. NEXT_PUBLIC_* vars are inlined
  // at build time, so relying on NEXT_PUBLIC_SITE_URL baked a stale vercel.app URL
  // into past builds — magic links must not depend on that. Non-prod (preview/local)
  // may still override via NEXT_PUBLIC_SITE_URL, else falls back to localhost.
  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_URL;
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Builds the absolute magic-link URL for a raw invite token. */
export function buildInviteLink(token: string): string {
  return `${resolveSiteUrl()}/auth/invite/${encodeURIComponent(token)}`;
}

export async function sendInstructorInviteEmail(input: {
  to: string;
  courseTitle: string;
  link: string;
}): Promise<void> {
  const subject = `Your course review is ready: ${input.courseTitle}`;

  const text = [
    `Your migrated course "${input.courseTitle}" is ready for your review on CourseBridge.`,
    "",
    "Open your review dashboard using this secure one-time link:",
    input.link,
    "",
    "This link signs you in directly — no password needed — and expires in 7 days.",
    "If you did not expect this email, you can safely ignore it.",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="font-size: 18px; margin-bottom: 8px;">Your course review is ready</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        Your migrated course <strong>${input.courseTitle}</strong> is ready for your review on CourseBridge.
      </p>
      <p style="margin: 24px 0;">
        <a href="${input.link}"
           style="background: #d97706; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
          Open my review dashboard
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
        This link signs you in directly — no password needed — and expires in 7 days.
        If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  await sendEmail({ to: input.to, subject, html, text });
}
