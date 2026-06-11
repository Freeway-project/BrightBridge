import "server-only";

import { microsoftGraphProvider } from "@/lib/email/providers/microsoft-graph";
import { noopProvider } from "@/lib/email/providers/noop";
import { resendProvider } from "@/lib/email/providers/resend";
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from "@/lib/email/types";

type ProviderName = "microsoft-graph" | "resend" | "noop" | "auto";

function readProviderPreference(): ProviderName {
  const raw = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (raw === "microsoft-graph" || raw === "resend" || raw === "noop") return raw;
  return "auto";
}

/**
 * Provider selection:
 *   - EMAIL_PROVIDER=microsoft-graph|resend|noop forces a specific provider.
 *   - EMAIL_PROVIDER=auto (default) prefers Microsoft Graph, then Resend,
 *     then the noop dev fallback.
 *
 * Exported for tests; production callers should use `sendEmail`.
 */
export function resolveEmailProvider(): EmailProvider {
  const preference = readProviderPreference();

  if (preference === "microsoft-graph") return microsoftGraphProvider;
  if (preference === "resend") return resendProvider;
  if (preference === "noop") return noopProvider;

  if (microsoftGraphProvider.isConfigured()) return microsoftGraphProvider;
  if (resendProvider.isConfigured()) return resendProvider;
  return noopProvider;
}

/**
 * Send a transactional email. The returned result reports which provider
 * handled the send and whether it was actually delivered (noop returns
 * delivered=false). Throws `EmailSendError` on provider failure — callers
 * that want best-effort behavior should wrap with try/catch and persist the
 * error message (see `instructor_emails.send_error`).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = resolveEmailProvider();
  return provider.send(input);
}
