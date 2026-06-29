import "server-only";
import { getPostgresPool } from "@/lib/postgres/pool";
import type { ConversationDetail, ConversationSummary, MessageHit, MessageRow } from "./types";
import { toIsoString, toIsoStringOrNull } from "./serialize";

/**
 * Title shown for a conversation, from the viewer's perspective. Support
 * conversations read "Admin Support" to the user who opened them and
 * "Support: {name}" to the admins answering.
 */
function resolveDisplayTitle(
  r: { type: string; title: string | null; created_by?: string | null; creator_name?: string | null },
  viewerId: string,
  partnerName: string | null,
): string {
  if (r.type === "dm") return partnerName ?? "Direct Message";
  if (r.type === "support") {
    return r.created_by === viewerId ? "Admin Support" : `Support: ${r.creator_name ?? "User"}`;
  }
  return r.title ?? "Group";
}

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
     ),
     partner as (
       select cm.conversation_id,
              coalesce(nullif(trim(p.full_name), ''), p.email) as partner_name
       from public.conversation_members cm
       join public.profiles p on p.id = cm.user_id
       join public.conversations cv on cv.id = cm.conversation_id and cv.type = 'dm'
       where cm.removed_at is null
         and cm.user_id != $1
     )
     select c.*,
            coalesce(unread.n, 0) as unread_count,
            last_msg.body as last_body,
            mems.user_ids,
            partner.partner_name,
            coalesce(nullif(trim(creator.full_name), ''), creator.email) as creator_name
     from public.conversations c
     join my on my.conversation_id = c.id
     left join last_msg on last_msg.conversation_id = c.id
     left join unread   on unread.conversation_id = c.id
     left join mems     on mems.conversation_id = c.id
     left join partner  on partner.conversation_id = c.id
     left join public.profiles creator on creator.id = c.created_by
     order by coalesce(c.last_message_at, c.created_at) desc`,
    [userId],
  );

  return rows.map((r): ConversationSummary => {
    const partnerName: string | null = r.partner_name ?? null;
    const displayTitle = resolveDisplayTitle(r, userId, partnerName);
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      courseId: r.course_id,
      roleKey: r.role_key,
      createdBy: r.created_by,
      createdAt: toIsoString(r.created_at),
      lastMessageAt: toIsoStringOrNull(r.last_message_at),
      unreadCount: r.unread_count ?? 0,
      lastMessagePreview: r.last_body ?? null,
      memberIds: r.user_ids ?? [],
      displayTitle,
      partnerName,
    };
  });
}

export async function getConversationDetail(
  conversationId: string,
  currentUserId: string,
): Promise<ConversationDetail | null> {
  const { rows } = await getPostgresPool().query(
    `select c.id, c.type, c.title, c.created_by,
            count(cm2.user_id)::int as member_count,
            (select coalesce(nullif(trim(p.full_name), ''), p.email)
             from public.conversation_members cm3
             join public.profiles p on p.id = cm3.user_id
             where cm3.conversation_id = c.id
               and cm3.removed_at is null
               and cm3.user_id != $2
             limit 1) as partner_name,
            (select coalesce(nullif(trim(p2.full_name), ''), p2.email)
             from public.profiles p2 where p2.id = c.created_by) as creator_name
     from public.conversations c
     join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = $2 and cm.removed_at is null
     join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.removed_at is null
     where c.id = $1
     group by c.id`,
    [conversationId, currentUserId],
  );
  const r = rows[0];
  if (!r) return null;
  const displayTitle = resolveDisplayTitle(r, currentUserId, r.partner_name ?? null);
  return { id: r.id, type: r.type, displayTitle, memberCount: r.member_count };
}

const MSG_SELECT = `
  select m.*,
    coalesce(nullif(trim(p.full_name), ''), p.email, m.author_id::text) as author_name,
    coalesce((select array_agg(mentioned_user_id) from public.message_mentions where message_id = m.id), '{}') as mentions,
    coalesce((select json_agg(json_build_object('emoji', emoji, 'user_id', user_id))
              from public.message_reactions where message_id = m.id), '[]') as reactions_raw,
    coalesce((select json_agg(json_build_object('id', id, 'storage_key', storage_key,
                                                'filename', filename, 'mime_type', mime_type,
                                                'size_bytes', size_bytes))
              from public.message_attachments where message_id = m.id), '[]') as attachments
  from public.messages m
  left join public.profiles p on p.id = m.author_id
`;

export async function listMessages(
  conversationId: string,
  { before, limit = 50 }: { before?: string; limit?: number } = {},
): Promise<MessageRow[]> {
  const { rows } = await getPostgresPool().query(
    `${MSG_SELECT}
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
    `${MSG_SELECT}
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
            ts_headline('simple', regexp_replace(m.body, E'<[^>]+>', '', 'g'),
                        plainto_tsquery('simple', $2),
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
    createdAt: toIsoString(r.created_at),
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
    authorName: r.author_name ?? r.author_id,
    parentId: r.parent_id,
    body: r.body,
    editedAt: toIsoStringOrNull(r.edited_at),
    deletedAt: toIsoStringOrNull(r.deleted_at),
    createdAt: toIsoString(r.created_at),
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
