import "server-only"
import { assertMember } from "./membership"
import { broadcastChatEvent } from "./realtime"
import * as repo from "./repository"
import { listMessages } from "./queries"

export async function sendMessage(input: repo.InsertMessageInput): Promise<string> {
  await assertMember(input.conversationId, input.authorId)
  const id = await repo.insertMessage(input)
  void broadcastChatEvent(input.conversationId, "message", {
    id,
    conversationId: input.conversationId,
    authorId: input.authorId,
    body: input.body,
    parentId: input.parentId ?? null,
    mentions: input.mentionIds ?? [],
    attachments: input.attachments ?? [],
    createdAt: new Date().toISOString(),
    reactions: [],
  })
  return id
}

export async function editOwnMessage(
  messageId: string,
  authorId: string,
  conversationId: string,
  body: string,
): Promise<void> {
  await assertMember(conversationId, authorId)
  await repo.editMessage(messageId, authorId, body)
  void broadcastChatEvent(conversationId, "message.edited", {
    id: messageId,
    body,
    editedAt: new Date().toISOString(),
  })
}

export async function deleteOwnMessage(
  messageId: string,
  authorId: string,
  conversationId: string,
): Promise<void> {
  await assertMember(conversationId, authorId)
  await repo.softDeleteMessage(messageId, authorId)
  void broadcastChatEvent(conversationId, "message.deleted", {
    id: messageId,
    deletedAt: new Date().toISOString(),
  })
}

export async function react(
  messageId: string,
  userId: string,
  conversationId: string,
  emoji: string,
  op: "add" | "remove",
): Promise<void> {
  await assertMember(conversationId, userId)
  if (op === "add") await repo.addReaction(messageId, userId, emoji)
  else await repo.removeReaction(messageId, userId, emoji)
  void broadcastChatEvent(
    conversationId,
    op === "add" ? "reaction.added" : "reaction.removed",
    { messageId, userId, emoji },
  )
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await assertMember(conversationId, userId)
  const lastReadAt = new Date().toISOString()
  await repo.markRead(conversationId, userId, lastReadAt)
  void broadcastChatEvent(conversationId, "read", { conversationId, userId, lastReadAt })
}

export { listMessages }
