import "server-only";

export type InstructorEmailStatus = "pending" | "sent" | "failed";

export type InstructorEmailProvider = "microsoft-graph" | "resend" | "noop";

export type InstructorEmailRow = {
  id: string;
  courseId: string;
  sentBy: string;
  recipient: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: InstructorEmailStatus;
  provider: InstructorEmailProvider | null;
  providerMessageId: string | null;
  sendError: string | null;
  sentAt: string | null;
  createdAt: string;
  /** Joined sender display name, when the query opted in. */
  sentByName?: string | null;
};

export type NewInstructorEmail = {
  courseId: string;
  sentBy: string;
  recipient: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
};
