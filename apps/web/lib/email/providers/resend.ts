import "server-only";

import { Resend } from "resend";

import {
  EmailSendError,
  type EmailProvider,
  type SendEmailInput,
  type SendEmailResult,
} from "@/lib/email/types";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
}

export const resendProvider: EmailProvider & { isConfigured: () => boolean } = {
  name: "resend",

  isConfigured() {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  },

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const resend = getClient();
    if (!resend) {
      throw new EmailSendError("Resend is not configured (RESEND_API_KEY).", "resend");
    }

    const from = input.from ?? process.env.EMAIL_FROM?.trim();
    if (!from) {
      throw new EmailSendError("EMAIL_FROM is not configured.", "resend");
    }

    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      throw new EmailSendError(error.message, "resend", error);
    }

    return {
      provider: "resend",
      delivered: true,
      providerMessageId: data?.id,
    };
  },
};
