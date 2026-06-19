import "server-only";
import { getPostgresPool } from "@/lib/postgres/pool";
import { ChatPermissionError } from "./types";
import { SUPPORT_ADMIN_ROLES } from "./support-roles";

const SUPPORT_TITLE = "Admin Support";

export async function assertMember(conversationId: string, userId: string): Promise<void> {
  const { rows } = await getPostgresPool().query<{ exists: boolean }>(
    `select exists(
       select 1 from public.conversation_members
       where conversation_id = $1 and user_id = $2 and removed_at is null
     ) as exists`,
    [conversationId, userId],
  );
  if (!rows[0]?.exists) throw new ChatPermissionError();
}

/** Ensures the course channel exists and its membership matches assignments. Idempotent. */
export async function syncCourseChannel(courseId: string): Promise<void> {
  const pool = getPostgresPool();
  const { rows: courseRows } = await pool.query<{ title: string }>(
    `select title from public.courses where id = $1`,
    [courseId],
  );
  if (!courseRows.length) return;
  const { rows: members } = await pool.query<{ user_id: string }>(
    `select distinct user_id
     from public.course_assignments
     where course_id = $1`,
    [courseId],
  );
  const desired = new Set(members.map((m) => m.user_id));

  const { rows: convRows } = await pool.query<{ id: string }>(
    `insert into public.conversations (type, title, course_id)
     values ('course', $2, $1)
     on conflict on constraint conversations_course_unique
       do update set title = excluded.title
     returning id`,
    [courseId, `# ${courseRows[0].title}`],
  );
  const convId = convRows[0].id;

  for (const userId of desired) {
    await pool.query(
      `insert into public.conversation_members (conversation_id, user_id)
       values ($1, $2)
       on conflict (conversation_id, user_id)
         do update set removed_at = null`,
      [convId, userId],
    );
  }

  await pool.query(
    `update public.conversation_members
     set removed_at = now()
     where conversation_id = $1
       and removed_at is null
       and user_id <> all($2::uuid[])`,
    [convId, [...desired]],
  );
}

/** Same shape as syncCourseChannel but for role channels. */
export async function syncRoleChannel(roleKey: string): Promise<void> {
  const pool = getPostgresPool();
  const { rows: convRows } = await pool.query<{ id: string }>(
    `insert into public.conversations (type, title, role_key)
     values ('role', $2, $1)
     on conflict on constraint conversations_role_unique do nothing
     returning id`,
    [roleKey, `# ${roleKey.replace(/_/g, "-")}`],
  );
  const convId = convRows[0]?.id ?? (await pool.query<{ id: string }>(
    `select id from public.conversations where type = 'role' and role_key = $1`,
    [roleKey],
  )).rows[0].id;

  const { rows: holders } = await pool.query<{ id: string }>(
    `select id from public.profiles where role = $1`,
    [roleKey],
  );
  for (const { id } of holders) {
    await pool.query(
      `insert into public.conversation_members (conversation_id, user_id)
       values ($1, $2)
       on conflict (conversation_id, user_id)
         do update set removed_at = null`,
      [convId, id],
    );
  }
  await pool.query(
    `update public.conversation_members
     set removed_at = now()
     where conversation_id = $1
       and removed_at is null
       and user_id <> all($2::uuid[])`,
    [convId, holders.map((h) => h.id)],
  );
}

/**
 * Returns the user's shared support conversation, creating it if needed.
 * Membership is additive: the requesting user plus every current admin
 * (SUPPORT_ADMIN_ROLES) are ensured as members so any admin can answer and
 * newly-promoted admins gain access to existing threads. Members are never
 * pruned here (unlike the role/course sync) — the requesting user is not an
 * admin and must remain a member.
 */
export async function getOrCreateSupportConversation(userId: string): Promise<string> {
  const pool = getPostgresPool();

  // Find-or-create the user's single support conversation (race-safe via the
  // conversations_support_unique partial index).
  const { rows: convRows } = await pool.query<{ id: string }>(
    `insert into public.conversations (type, title, created_by)
     values ('support', $2, $1)
     on conflict (created_by) where type = 'support'
       do update set title = excluded.title
     returning id`,
    [userId, SUPPORT_TITLE],
  );
  const convId = convRows[0].id;

  // The requesting user is always a member.
  await pool.query(
    `insert into public.conversation_members (conversation_id, user_id)
     values ($1, $2)
     on conflict (conversation_id, user_id)
       do update set removed_at = null`,
    [convId, userId],
  );

  // Every admin is a member.
  const { rows: admins } = await pool.query<{ id: string }>(
    `select id from public.profiles where role = any($1::text[])`,
    [[...SUPPORT_ADMIN_ROLES]],
  );
  for (const { id } of admins) {
    await pool.query(
      `insert into public.conversation_members (conversation_id, user_id)
       values ($1, $2)
       on conflict (conversation_id, user_id)
         do update set removed_at = null`,
      [convId, id],
    );
  }

  return convId;
}
