import "server-only";

import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";

/**
 * Dev fallback. Logs the message to the server console and reports
 * delivered=false so callers can record it as a "not really sent" event
 * without surfacing it as a delivery error.
 */
export const noopProvider: EmailProvider = {
  name: "noop",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    console.warn(
      `[email] No provider configured — skipping send to ${input.to}.\n` +
        `  Subject: ${input.subject}\n  ${input.text}`,
    );
    return { provider: "noop", delivered: false };
  },
};
