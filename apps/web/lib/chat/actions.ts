"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/context";
import * as service from "./service";
import * as repo from "./repository";

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(8_000),
  parentId: z.string().uuid().nullish(),
  mentionIds: z.array(z.string().uuid()).max(50).optional(),
  attachments: z.array(z.object({
    storageKey: z.string().min(1),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(127),
    sizeBytes: z.number().int().nonnegative().max(25 * 1024 * 1024),
  })).max(5).optional(),
});

export async function sendMessageAction(input: unknown): Promise<{ messageId: string }> {
  const parsed = sendSchema.parse(input);
  const ctx = await requireProfile();
  const authorName = ctx.profile.fullName ?? ctx.profile.email ?? ctx.userId;
  const messageId = await service.sendMessage(
    {
      ...parsed,
      authorId: ctx.userId,
      parentId: parsed.parentId ?? null,
    },
    authorName,
  );
  revalidatePath(`/chat/${parsed.conversationId}`);
  return { messageId };
}

const editSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(8_000),
});

export async function editMessageAction(input: unknown): Promise<void> {
  const parsed = editSchema.parse(input);
  const ctx = await requireProfile();
  await service.editOwnMessage(parsed.messageId, ctx.userId, parsed.conversationId, parsed.body);
}

const idPair = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export async function deleteMessageAction(input: unknown): Promise<void> {
  const { messageId, conversationId } = idPair.parse(input);
  const ctx = await requireProfile();
  await service.deleteOwnMessage(messageId, ctx.userId, conversationId);
}

const reactSchema = idPair.extend({ emoji: z.string().min(1).max(64) });

export async function addReactionAction(input: unknown): Promise<void> {
  const parsed = reactSchema.parse(input);
  const ctx = await requireProfile();
  await service.react(parsed.messageId, ctx.userId, parsed.conversationId, parsed.emoji, "add");
}
export async function removeReactionAction(input: unknown): Promise<void> {
  const parsed = reactSchema.parse(input);
  const ctx = await requireProfile();
  await service.react(parsed.messageId, ctx.userId, parsed.conversationId, parsed.emoji, "remove");
}

export async function markReadAction(input: unknown): Promise<void> {
  const { conversationId } = z.object({ conversationId: z.string().uuid() }).parse(input);
  const ctx = await requireProfile();
  await service.markConversationRead(conversationId, ctx.userId);
}

const prefSchema = z.object({
  conversationId: z.string().uuid(),
  pref: z.enum(["all", "mentions", "none"]),
});
export async function setNotificationPrefAction(input: unknown): Promise<void> {
  const parsed = prefSchema.parse(input);
  const ctx = await requireProfile();
  await repo.setNotificationPref(parsed.conversationId, ctx.userId, parsed.pref);
}

const createDmSchema = z.object({ otherUserId: z.string().uuid() });
export async function createDmAction(input: unknown): Promise<{ conversationId: string }> {
  const { otherUserId } = createDmSchema.parse(input);
  const ctx = await requireProfile();
  const conversationId = await repo.createConversation({
    type: "dm",
    memberIds: [ctx.userId, otherUserId],
  });
  return { conversationId };
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  memberIds: z.array(z.string().uuid()).min(1).max(50),
});
export async function createGroupAction(input: unknown): Promise<{ conversationId: string }> {
  const parsed = createGroupSchema.parse(input);
  const ctx = await requireProfile();
  const conversationId = await repo.createConversation({
    type: "group",
    name: parsed.name,
    createdBy: ctx.userId,
    memberIds: parsed.memberIds,
  });
  return { conversationId };
}

const addMembersSchema = z.object({
  conversationId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});
export async function addMembersAction(input: unknown): Promise<void> {
  const parsed = addMembersSchema.parse(input);
  const ctx = await requireProfile();
  await import("./membership").then((m) => m.assertMember(parsed.conversationId, ctx.userId));
  await repo.addMembers(parsed.conversationId, parsed.userIds);
}

export async function leaveConversationAction(input: unknown): Promise<void> {
  const { conversationId } = z.object({ conversationId: z.string().uuid() }).parse(input);
  const ctx = await requireProfile();
  await repo.leaveConversation(conversationId, ctx.userId);
}
