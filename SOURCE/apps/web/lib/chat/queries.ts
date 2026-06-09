import "server-only";
import { getPostgresPool } from "@/lib/postgres/pool";
import type { ConversationSummary, MessageHit, MessageRow } from "./types";

export async function listConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const { rows } = await getPostgresPool().query(
    `with my as (
       select cm.conversation_id, cm.last_read_at
       from public.conversation_members cm
       where cm.user_id = $1 and cm.removed_at is null
     ),
     last_msg as (
       select distinct on (m.conversation_id) m.conversation_id, m.body, m.created_at
       from public.messages m
       join my on my.conversation_id = m.conversation_id
       where m.deleted_at is null
       order by m.conversation_id, m.created_at desc
     ),
     unread as (
       select m.conversation_id, count(*)::int as n
       from public.messages m
       join my on my.conversation_id = m.conversation_id
       where m.deleted_at is null
         and (my.last_read_at is null or m.created_at > my.last_read_at)
       group by m.conversation_id
     ),
     mems as (
       select cm.conversation_id, array_agg(cm.user_id) as user_ids
       from public.conversation_members cm
       where cm.removed_at is null
       group by cm.conversation_id
     )
     select c.*,
            coalesce(unread.n, 0) as unread_count,
            last_msg.body as last_body,
            mems.user_ids
     from public.conversations c
     join my on my.conversation_id = c.id
     left join last_msg on last_msg.conversation_id = c.id
     left join unread   on unread.conversation_id = c.id
     left join mems     on mems.conversation_id = c.id
     order by coalesce(c.last_message_at, c.created_at) desc`,
    [userId],
  );

  return rows.map((r): ConversationSummary => ({
    id: r.id,
    type: r.type,
    title: r.title,
    courseId: r.course_id,
    roleKey: r.role_key,
    createdBy: r.created_by,
    createdAt: r.created_at,
    lastMessageAt: r.last_message_at,
    unreadCount: r.unread_count ?? 0,
    lastMessagePreview: r.last_body ?? null,
    memberIds: r.user_ids ?? [],
    displayTitle: r.title ?? "(direct message)",
  }));
}

export async function listMessages(
  conversationId: string,
  { before, limit = 50 }: { before?: string; limit?: number } = {},
): Promise<MessageRow[]> {
  const { rows } = await getPostgresPool().query(
    `select m.*,
       coalesce((select array_agg(mentioned_user_id) from public.message_mentions where message_id = m.id), '{}') as mentions,
       coalesce((select json_agg(json_build_object('emoji', emoji, 'user_id', user_id))
                 from public.message_reactions where message_id = m.id), '[]') as reactions_raw,
       coalesce((select json_agg(json_build_object('id', id, 'storage_key', storage_key,
                                                   'filename', filename, 'mime_type', mime_type,
                                                   'size_bytes', size_bytes))
                 from public.message_attachments where message_id = m.id), '[]') as attachments
     from public.messages m
     where m.conversation_id = $1
       and m.parent_id is null
       and ($2::timestamptz is null or m.created_at < $2)
     order by m.created_at desc
     limit $3`,
    [conversationId, before ?? null, limit],
  );
  return rows.map(mapMessage).reverse();
}

export async function listThread(parentId: string): Promise<MessageRow[]> {
  const { rows } = await getPostgresPool().query(
    `select m.*,
       coalesce((select array_agg(mentioned_user_id) from public.message_mentions where message_id = m.id), '{}') as mentions,
       coalesce((select json_agg(json_build_object('emoji', emoji, 'user_id', user_id))
                 from public.message_reactions where message_id = m.id), '[]') as reactions_raw,
       coalesce((select json_agg(json_build_object('id', id, 'storage_key', storage_key,
                                                   'filename', filename, 'mime_type', mime_type,
                                                   'size_bytes', size_bytes))
                 from public.message_attachments where message_id = m.id), '[]') as attachments
     from public.messages m
     where m.id = $1 or m.parent_id = $1
     order by m.created_at asc`,
    [parentId],
  );
  return rows.map(mapMessage);
}

export async function searchMessages(
  userId: string,
  q: string,
  { conversationId, limit = 20 }: { conversationId?: string; limit?: number } = {},
): Promise<MessageHit[]> {
  const { rows } = await getPostgresPool().query(
    `select m.id as message_id, m.conversation_id, m.created_at,
            ts_headline('simple', m.body, plainto_tsquery('simple', $2),
                        'MaxFragments=1,MaxWords=18,MinWords=6') as snippet
     from public.messages m
     where m.deleted_at is null
       and m.search_tsv @@ plainto_tsquery('simple', $2)
       and m.conversation_id in (
         select conversation_id from public.conversation_members
         where user_id = $1 and removed_at is null
       )
       and ($3::uuid is null or m.conversation_id = $3)
     order by ts_rank_cd(m.search_tsv, plainto_tsquery('simple', $2)) desc, m.created_at desc
     limit $4`,
    [userId, q, conversationId ?? null, limit],
  );
  return rows.map((r) => ({
    messageId: r.message_id,
    conversationId: r.conversation_id,
    snippet: r.snippet,
    createdAt: r.created_at,
  }));
}

function mapMessage(r: any): MessageRow {
  const reactionsRaw = (r.reactions_raw ?? []) as Array<{ emoji: string; user_id: string }>;
  const byEmoji = new Map<string, string[]>();
  for (const rr of reactionsRaw) {
    const arr = byEmoji.get(rr.emoji) ?? [];
    arr.push(rr.user_id);
    byEmoji.set(rr.emoji, arr);
  }
  return {
    id: r.id,
    conversationId: r.conversation_id,
    authorId: r.author_id,
    parentId: r.parent_id,
    body: r.body,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    mentions: r.mentions ?? [],
    reactions: [...byEmoji.entries()].map(([emoji, userIds]) => ({ emoji, userIds })),
    attachments: (r.attachments ?? []).map((a: any) => ({
      id: a.id,
      storageKey: a.storage_key,
      filename: a.filename,
      mimeType: a.mime_type,
      sizeBytes: Number(a.size_bytes),
    })),
  };
}
