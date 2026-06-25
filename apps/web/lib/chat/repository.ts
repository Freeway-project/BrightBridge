import "server-only";
import { getPostgresPool } from "@/lib/postgres/pool";

export type CreateConversationInput =
  | { type: "dm"; memberIds: [string, string] }
  | { type: "group"; name: string; createdBy: string; memberIds: string[] };

export async function createConversation(input: CreateConversationInput): Promise<string> {
  const pool = getPostgresPool();
  if (input.type === "dm") {
    const { rows: existing } = await pool.query<{ id: string }>(
      `select c.id
       from public.conversations c
       join public.conversation_members m1
         on m1.conversation_id = c.id and m1.user_id = $1 and m1.removed_at is null
       join public.conversation_members m2
         on m2.conversation_id = c.id and m2.user_id = $2 and m2.removed_at is null
       where c.type = 'dm'
       limit 1`,
      input.memberIds,
    );
    if (existing[0]) return existing[0].id;
  }

  const { rows } = await pool.query<{ id: string }>(
    `insert into public.conversations (type, title, created_by)
     values ($1, $2, $3) returning id`,
    [input.type, input.type === "group" ? input.name : null, input.type === "group" ? input.createdBy : null],
  );
  const conversationId = rows[0].id;
  const memberIds = input.type === "dm" ? input.memberIds : [...new Set([input.createdBy, ...input.memberIds])];
  for (const userId of memberIds) {
    await pool.query(
      `insert into public.conversation_members (conversation_id, user_id)
       values ($1, $2) on conflict do nothing`,
      [conversationId, userId],
    );
  }
  return conversationId;
}

export interface InsertMessageInput {
  conversationId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  mentionIds?: string[];
  attachments?: Array<{ storageKey: string; filename: string; mimeType: string; sizeBytes: number }>;
}

export async function insertMessage(input: InsertMessageInput): Promise<string> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ id: string }>(
      `insert into public.messages (conversation_id, author_id, parent_id, body)
       values ($1, $2, $3, $4) returning id`,
      [input.conversationId, input.authorId, input.parentId ?? null, input.body],
    );
    const messageId = rows[0].id;
    for (const userId of input.mentionIds ?? []) {
      await client.query(
        `insert into public.message_mentions (message_id, mentioned_user_id)
         values ($1, $2) on conflict do nothing`,
        [messageId, userId],
      );
    }
    for (const att of input.attachments ?? []) {
      await client.query(
        `insert into public.message_attachments
           (message_id, storage_key, filename, mime_type, size_bytes)
         values ($1, $2, $3, $4, $5)`,
        [messageId, att.storageKey, att.filename, att.mimeType, att.sizeBytes],
      );
    }
    await client.query(
      `update public.conversations set last_message_at = now() where id = $1`,
      [input.conversationId],
    );
    await client.query("commit");
    return messageId;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function editMessage(messageId: string, authorId: string, body: string): Promise<void> {
  await getPostgresPool().query(
    `update public.messages set body = $3, edited_at = now()
     where id = $1 and author_id = $2 and deleted_at is null`,
    [messageId, authorId, body],
  );
}

export async function softDeleteMessage(messageId: string, authorId: string): Promise<void> {
  await getPostgresPool().query(
    `update public.messages set body = '', deleted_at = now()
     where id = $1 and author_id = $2 and deleted_at is null`,
    [messageId, authorId],
  );
}

export async function addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  await getPostgresPool().query(
    `insert into public.message_reactions (message_id, user_id, emoji)
     values ($1, $2, $3) on conflict do nothing`,
    [messageId, userId, emoji],
  );
}

export async function removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  await getPostgresPool().query(
    `delete from public.message_reactions
     where message_id = $1 and user_id = $2 and emoji = $3`,
    [messageId, userId, emoji],
  );
}

export async function markRead(conversationId: string, userId: string, lastReadAt: string): Promise<void> {
  await getPostgresPool().query(
    `update public.conversation_members set last_read_at = $3
     where conversation_id = $1 and user_id = $2`,
    [conversationId, userId, lastReadAt],
  );
}

export async function setNotificationPref(
  conversationId: string,
  userId: string,
  pref: "all" | "mentions" | "none",
): Promise<void> {
  await getPostgresPool().query(
    `update public.conversation_members set notification_pref = $3
     where conversation_id = $1 and user_id = $2`,
    [conversationId, userId, pref],
  );
}

export async function addMembers(conversationId: string, userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    await getPostgresPool().query(
      `insert into public.conversation_members (conversation_id, user_id)
       values ($1, $2) on conflict (conversation_id, user_id)
         do update set removed_at = null`,
      [conversationId, userId],
    );
  }
}

export async function leaveConversation(conversationId: string, userId: string): Promise<void> {
  await getPostgresPool().query(
    `update public.conversation_members set removed_at = now()
     where conversation_id = $1 and user_id = $2`,
    [conversationId, userId],
  );
}

export async function getConversationMemberIds(conversationId: string): Promise<string[]> {
  const { rows } = await getPostgresPool().query<{ user_id: string }>(
    `select user_id from public.conversation_members
     where conversation_id = $1 and removed_at is null`,
    [conversationId],
  );
  return rows.map((r) => r.user_id);
}

export async function getConversationMembersWithPrefs(
  conversationId: string,
): Promise<Array<{ userId: string; notificationPref: string }>> {
  const { rows } = await getPostgresPool().query<{
    user_id: string;
    notification_pref: string | null;
  }>(
    `select user_id, notification_pref from public.conversation_members
     where conversation_id = $1 and removed_at is null`,
    [conversationId],
  );
  return rows.map((r) => ({ userId: r.user_id, notificationPref: r.notification_pref ?? "all" }));
}

