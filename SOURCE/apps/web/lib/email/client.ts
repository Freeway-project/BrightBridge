import "server-only";

import { sendEmail as sendEmailViaService } from "@/lib/email/service";
import type { SendEmailInput } from "@/lib/email/types";

export type { SendEmailInput } from "@/lib/email/types";

/**
 * Back-compat shim. New code should import from `@/lib/email/service` to get
 * the full result (provider, delivered). This wrapper preserves the original
 * fire-and-forget signature so existing callers keep working.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  await sendEmailViaService(input);
}
