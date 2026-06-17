import "server-only";

export type ConversationType = "dm" | "course" | "role" | "group";
export type NotificationPref = "all" | "mentions" | "none";

export interface ConversationRow {
  id: string;
  type: ConversationType;
  title: string | null;
  courseId: string | null;
  roleKey: string | null;
  createdBy: string | null;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ConversationSummary extends ConversationRow {
  unreadCount: number;
  lastMessagePreview: string | null;
  memberIds: string[];
  displayTitle: string;
  partnerName: string | null;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  joinedAt: string;
  removedAt: string | null;
  lastReadAt: string | null;
  notificationPref: NotificationPref;
}

export interface AttachmentRow {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  mentions: string[];
  reactions: { emoji: string; userIds: string[] }[];
  attachments: AttachmentRow[];
}

export interface ConversationDetail {
  id: string;
  type: ConversationType;
  displayTitle: string;
  memberCount: number;
}

export interface MessageHit {
  messageId: string;
  conversationId: string;
  snippet: string;
  createdAt: string;
}

export class ChatPermissionError extends Error {
  constructor(message = "Not a member of this conversation.") {
    super(message);
    this.name = "ChatPermissionError";
  }
}
