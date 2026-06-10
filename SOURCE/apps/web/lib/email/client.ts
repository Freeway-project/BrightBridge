import "server-only";

import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
}

/**
 * Sends a transactional email via Resend. When RESEND_API_KEY is unset (local
 * dev / CI), this is a no-op that logs the message so flows remain testable
 * without email infrastructure — the recipient and any link are printed.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY unset — skipping send to ${input.to}.\n` +
        `  Subject: ${input.subject}\n  ${input.text}`,
    );
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
