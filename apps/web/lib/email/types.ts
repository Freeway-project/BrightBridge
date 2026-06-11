import "server-only";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional override; falls back to provider's configured sender. */
  from?: string;
  /** Optional reply-to address. */
  replyTo?: string;
};

export type SendEmailResult = {
  /** Provider that handled (or skipped) the send. */
  provider: "microsoft-graph" | "resend" | "noop";
  /** True when the provider acknowledged the send. False for the noop dev path. */
  delivered: boolean;
  /** Provider-supplied id, when available (Graph returns none for sendMail). */
  providerMessageId?: string;
};

export interface EmailProvider {
  readonly name: SendEmailResult["provider"];
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/**
 * Thrown when a configured provider fails to deliver. Callers (e.g. the
 * instructor-email service) catch this and persist `message` to
 * `instructor_emails.send_error` so the Emails tab can surface it.
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly provider: SendEmailResult["provider"],
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}
