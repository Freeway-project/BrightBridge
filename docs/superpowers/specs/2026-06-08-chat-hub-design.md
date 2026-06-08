# Chat Hub — Design Spec

**Status:** Draft (Phase 1 of multi-phase chat work)
**Date:** 2026-06-08
**Branch:** `comms-channel` (base: `ft-AzureMigration`)

## 1. Goals

Ship a Teams/Slack-style in-app chat hub at `/chat` that lets Admins, TAs, and
Instructors communicate in real time across four conversation types: direct
messages, per-course channels, role channels, and ad-hoc groups. All
self-hosted. Voice, video, and a public drop-in lobby are explicit non-goals
for this phase.

## 2. Scope

### In scope (Phase 1)

- `/chat` route — sidebar of conversations + active conversation pane
- Four conversation types: `dm`, `course`, `role`, `group`
- Real-time message delivery via SSE on the active conversation
- Sidebar polls (10 s) for unread badges
- Per-message features: edit/delete, @mentions, file attachments, threaded
  replies, emoji reactions, read receipts
- Full-text search scoped to the user's conversations
- Auto-membership for course + role channels
- Rename the existing per-course `Chat` tab to `Discussion` (workflow comments
  thread stays untouched otherwise)

### Out of scope (deferred to later phases)

- Public drop-in lobby for instructors
- Voice / video calls (self-hosted SFU + TURN)
- Push notifications (mobile + web push)
- Mention notifications via email
- Cross-instance pub/sub bridge (single-container MVP)
- Typo-tolerant search (`pg_trgm`)
- Attachment garbage collection cron
- Moderation tooling (reporting, abuse flags) — admin soft-delete only

## 3. Architecture

```
┌────────────────────────────────────────────────────┐
│ View                                               │
│  app/(dashboard)/chat/                             │
│   ├─ page.tsx                          (hub root)  │
│   ├─ [conversationId]/page.tsx         (active)    │
│   ├─ [conversationId]/thread/          (mobile)    │
│   │     [parentId]/page.tsx                        │
│   └─ _components/{ Sidebar, MessageList, Composer, │
│                    MessageItem, MentionPicker,     │
│                    AttachmentDropzone, EmojiPicker}│
│                                                    │
│ Controller (server)                                │
│  app/api/chat/stream/[conversationId]/route.ts ──► SSE
│  app/api/chat/attachments/upload/route.ts          │
│  app/api/chat/attachments/[id]/route.ts            │
│  app/api/chat/search/route.ts                      │
│  lib/chat/actions.ts        (server actions)       │
│  lib/chat/service.ts        (business logic)       │
│                                                    │
│ Model                                              │
│  lib/chat/                                         │
│   ├─ types.ts                                      │
│   ├─ queries.ts             (read)                 │
│   ├─ repository.ts          (write)                │
│   ├─ membership.ts          (auto-membership sync) │
│   └─ events.ts              (in-process pub/sub)   │
│                                                    │
│ DB: 8 tables (Section 4)                           │
└────────────────────────────────────────────────────┘
```

Modular MVC: Model (queries/repository/membership/events) holds data + state,
Controller (service + server actions + routes) holds business rules + PBAC,
View holds presentation. Single-instance Node — the in-process EventEmitter is
the real-time fanout; a Postgres `LISTEN/NOTIFY` bridge is a Phase 1.5 add for
multi-instance.

## 4. Data model

Migration `supabase/migrations/20260608000000_chat_init.sql`. No RLS — Postgres
runs behind the app-layer PBAC model adopted in the Azure cutover. Tables are
granted `select, insert, update, delete` to the `app_runtime` role only.

```sql
-- 1. Conversations
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('dm','course','role','group')),
  title           text,
  course_id       uuid references public.courses(id) on delete cascade,
  role_key        text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);
create unique index conversations_course_unique
  on public.conversations(course_id) where type = 'course';
create unique index conversations_role_unique
  on public.conversations(role_key) where type = 'role';

-- 2. Membership
create table public.conversation_members (
  conversation_id    uuid not null references public.conversations(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  joined_at          timestamptz not null default now(),
  removed_at         timestamptz,
  last_read_at       timestamptz,
  notification_pref  text not null default 'all'
    check (notification_pref in ('all','mentions','none')),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx
  on public.conversation_members(user_id) where removed_at is null;

-- 3. Messages
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id       uuid not null references public.profiles(id),
  parent_id       uuid references public.messages(id) on delete cascade,
  body            text not null,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  search_tsv      tsvector generated always as
                    (to_tsvector('simple', coalesce(body,''))) stored
);
create index messages_conversation_idx
  on public.messages(conversation_id, created_at desc);
create index messages_parent_idx
  on public.messages(parent_id) where parent_id is not null;
create index messages_search_idx
  on public.messages using gin (search_tsv);

-- 4. Mentions
create table public.message_mentions (
  message_id        uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (message_id, mentioned_user_id)
);

-- 5. Reactions
create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- 6. Attachments (metadata; bytes in R2)
create table public.message_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  storage_key text not null,
  filename    text not null,
  mime_type   text not null,
  size_bytes  bigint not null,
  created_at  timestamptz not null default now()
);

grant select, insert, update, delete on
  public.conversations,
  public.conversation_members,
  public.messages,
  public.message_mentions,
  public.message_reactions,
  public.message_attachments
to app_runtime;
```

**Notes:**
- `conversations.title` is null for DMs (derived from the other member).
- Partial unique indexes on `course_id`/`role_key` make backfill idempotent.
- `conversation_members.removed_at` soft-removes so old messages still resolve
  author and the user can be re-added without losing history.
- `messages.deleted_at` soft-deletes; the UI shows a tombstone placeholder so
  threads stay readable. Body is cleared on delete (privacy).

## 5. Security model

- No RLS. Authorization lives in the controller layer.
- Every server action calls `assertMember(conversationId, userId)` before any
  write or read of message data.
- Every query in `queries.ts` joins on `conversation_members` filtered by the
  caller. There is no path that returns messages without that join.
- DB-level defense-in-depth: only the `app_runtime` role has DML privileges on
  chat tables; the `anon` role has nothing.
- DM creation is unconditional between any two signed-in users. Group creation
  is open: creator picks any users.
- Search is scoped at the SQL layer to the caller's active memberships.

## 6. Real-time transport (SSE)

**Endpoint:** `GET /api/chat/stream/[conversationId]` returns
`text/event-stream`.

**Flow:**
1. Server authenticates session, then `assertMember`.
2. Server subscribes to the in-process `events` bus for the `conversationId`.
3. Server writes a `ready` event, then forwards each bus event to the client.
4. On `controller.enqueue` error (client gone), server unsubscribes and exits.

**Operational:**
- Heartbeat `: ping\n\n` every 25 s to defeat proxy idle-timeouts.
- Client `EventSource` reconnects automatically; server re-asserts membership
  on each connection.
- One stream per **open conversation tab**, not per user — sidebar uses
  polling for unread badges, keeping fan-out flat.

**Event types** (additive; UI dedupes by `message.id`):
```
event: message            data: { id, conversationId, authorId, body, parentId, createdAt, mentions[], attachments[] }
event: message.edited     data: { id, body, editedAt }
event: message.deleted    data: { id, deletedAt }
event: reaction.added     data: { messageId, userId, emoji }
event: reaction.removed   data: { messageId, userId, emoji }
event: read               data: { conversationId, userId, lastReadAt }
event: member.joined      data: { conversationId, userId, joinedAt }
event: member.left        data: { conversationId, userId, removedAt }
```

**Pub/sub (`lib/chat/events.ts`):**
```ts
const bus = new EventEmitter();
export const events = {
  publish: (cid: string, type: string, payload: unknown) =>
    bus.emit(cid, { type, payload }),
  subscribe: (cid: string, fn: (e: { type: string; payload: unknown }) => void) => {
    bus.on(cid, fn);
    return () => bus.off(cid, fn);
  },
};
```

Every write in `repository.ts` calls `events.publish` after a successful
commit, inside the same request — no background workers.

## 7. Permissions & auto-membership

Permission model is **open**: any signed-in user can DM anyone, create a group
with anyone, and be in any channel they're a member of. Channels gate access
through `conversation_members` exclusively — the controller never makes
type-specific decisions about who can read what.

**Auto-membership triggers:**

| Event                              | Effect                                                                                        |
|------------------------------------|-----------------------------------------------------------------------------------------------|
| Course created                     | Create `type='course'` conversation. Add reviewers + instructors.                             |
| Reviewer/instructor added to course| `insert` row in `conversation_members`.                                                       |
| Reviewer/instructor removed        | Set `removed_at = now()` (soft-remove).                                                       |
| Profile role changed               | Add to new role channel; soft-remove from old.                                                |
| First boot / migration             | Backfill: one course channel per existing course + one role channel per distinct role.        |

Implemented in `lib/chat/membership.ts` (`syncCourseChannel(courseId)`,
`syncRoleChannel(roleKey)`), called from the existing course-assignment and
role-change server actions inside the same transaction. Failure logs but does
not roll back the surrounding workflow change.

## 8. API surface

**Server actions** (`apps/web/lib/chat/actions.ts`) — every action begins with
`requireProfile()` + `assertMember(conversationId, userId)` where applicable:

```ts
createDmAction({ otherUserId }): { conversationId }
createGroupAction({ name, memberIds }): { conversationId }
sendMessageAction({ conversationId, body, parentId?, mentionIds?, attachments? }): { messageId }
editMessageAction({ messageId, body }): void
deleteMessageAction({ messageId }): void
addReactionAction({ messageId, emoji }): void
removeReactionAction({ messageId, emoji }): void
markReadAction({ conversationId, lastReadAt }): void
setNotificationPrefAction({ conversationId, pref }): void
addMembersAction({ conversationId, userIds }): void   // group only
leaveConversationAction({ conversationId }): void     // group + DM only
```

**Queries** (`apps/web/lib/chat/queries.ts`):

```ts
listConversationsForUser(userId): ConversationSummary[]            // sidebar
getConversation(conversationId, userId): ConversationDetail | null // throws if not member
listMessages(conversationId, { before?, limit=50 }): Message[]     // cursor pagination
listThread(parentMessageId): Message[]
searchMessages(userId, q, { conversationId?, limit=50 }): MessageHit[]
listMembersWithStatus(conversationId): MemberPresence[]            // joins online_presence
```

**Routes:**

| Route                                                       | Purpose                                              |
|-------------------------------------------------------------|------------------------------------------------------|
| `app/api/chat/stream/[conversationId]/route.ts`             | SSE stream (Section 6)                               |
| `app/api/chat/attachments/upload/route.ts`                  | Pre-signed R2 PUT URL minting; PBAC + size cap       |
| `app/api/chat/attachments/[id]/route.ts`                    | Signed GET URL (short TTL)                           |
| `app/api/chat/search/route.ts`                              | Wraps `searchMessages` for the Cmd+K palette         |

## 9. Attachments

- Bytes in R2 via `packages/storage`; metadata in `message_attachments`.
- Two-step upload: client requests pre-signed PUT URL → uploads bytes directly
  to R2 → calls `sendMessageAction` with the attachment metadata.
- Caps: 25 MB per file, 5 files per message; mime allowlist (images, PDFs,
  common office formats, `.zip`). Enforced server-side; client validates
  first for UX.
- Images render inline (lazy-loaded); other files render as a tile with
  filename, size, and icon.
- Soft-deleted messages retain their attachments in R2 for 30 days; sweeper
  cron is Phase 1.5 ops, not part of this spec.

## 10. Search

- Postgres full-text via the generated `search_tsv` column on `messages`.
- Scope filter at SQL: `where conversation_id in (select conversation_id from
  conversation_members where user_id = $1 and removed_at is null)`.
- Ranking via `ts_rank_cd`.
- UI: Cmd+K palette opens shadcn `Command`; the `search` route returns the
  top 20 hits with a 200 ms debounce. Clicking a hit routes to
  `/chat/[conversationId]?focus=[messageId]` and scrolls to the highlighted
  row.
- No fuzzy matching in MVP — `simple` dictionary, no `pg_trgm`. Deferred.

## 11. UI components

Built on shadcn/ui primitives already in the repo. New deps are small and
focused.

**Layout primitives:**
- `ResizablePanelGroup` + `ResizablePanel` — three-pane shell:
  sidebar / message list / optional thread panel
- `ScrollArea` — message list with sticky bottom
- `Sheet` — mobile drawer for the sidebar
- `Tooltip`, `Avatar`, `Badge` — already in use elsewhere

**Conversation list (sidebar):**
- `Tabs` — top-level: All / DMs / Channels / Groups
- `Command` — Cmd+K fuzzy search across conversations + people
- `DropdownMenu` — new-conversation menu (New DM, New group, Join channel)
- Each row: avatar, name, last-message preview, unread badge, mute icon

**Message list:**
- Grouped by author within a 5-minute window (collapses repeat avatars)
- `react-markdown` + `rehype-sanitize` for body — bold/italic/code/links only,
  no raw HTML
- Hover row actions via `DropdownMenu`: react / reply in thread / edit /
  delete / copy-link
- `ContextMenu` (right-click) mirrors the hover actions for accessibility
- Inline edit: textarea replaces body with Save/Cancel; no modal
- Deleted messages render as a muted tombstone

**Composer:**
- `Textarea` — Enter to send, Shift+Enter for newline
- `@` triggers inline `Command` user picker
- `:` triggers emoji picker (using **frimousse** — headless, ~3 KB) inside a
  shadcn `Popover`
- Attachment button → native file input wrapped in a styled dropzone
  (~30 LOC, no extra dep); paste-to-attach images supported
- Reply state: composer header shows "Replying to @Alex" with dismiss `X`

**Thread panel:**
- `Sheet` (right side) on desktop; full-screen route on mobile
  (`/chat/[id]/thread/[parentId]`)
- Reuses `MessageList` + `Composer`, pinned to `parent_id`

**Conversation header:**
- Conversation title + member avatars
- `DropdownMenu` settings: mute / mention-only / unmute (drives
  `setNotificationPrefAction`), add members (groups only), leave (groups +
  DMs only)

**Modals:**
- New DM — `Dialog` with `Command` user picker
- New group — `Dialog` with multi-select `Command` + name input
- File preview — `Dialog` lightbox + zoom for images; non-images open in new tab

**Mobile (≤768 px):**
- Sidebar collapses behind `Sheet` via header hamburger
- Thread becomes a full-screen route
- Composer sticky to bottom; `dvh` units handle the on-screen keyboard

**New dependencies:**
- `frimousse` — emoji picker (~3 KB, headless)
- `react-markdown` + `rehype-sanitize` — safe HTML rendering

**Styling:** uses existing Tailwind CSS variables (`--card-spacing`, theme
tokens). No new design tokens.

## 12. Rollout

1. **Migration** `20260608000000_chat_init.sql` — Section 4.
2. **Backfill script** `scripts/backfill-chat-channels.mjs` — one course
   channel per existing course; one role channel per distinct role. Idempotent.
3. **Auto-membership hooks** — `syncCourseChannel` / `syncRoleChannel` called
   from existing course-assignment and role-change server actions.
4. **App code** — `lib/chat/*`, `app/api/chat/*`, `app/(dashboard)/chat/*`.
5. **Top-nav entry point** — add `Chat` link with unread badge (polled every
   30 s).
6. **Rename** existing per-course `Chat` tab to `Discussion` (and update the
   icon to a comment glyph so it visually reads as workflow notes, not chat).
7. **Feature flag** `NEXT_PUBLIC_CHAT_ENABLED` — defaults off; flip per env.
   Hides nav entry; redirects `/chat` to dashboard when off.

## 13. Testing

**Unit (Vitest):**
- `repository.ts`: insert / edit / delete / react paths against a test
  Postgres
- `events.ts`: publish / subscribe / unsubscribe leak check (no listeners
  left after unsubscribe)
- `membership.ts`: `syncCourseChannel` idempotent (run twice → one row)
- `queries.ts::searchMessages`: scope filter — user A cannot see user B's
  hits even when bodies match

**Integration (Playwright):**
- Two browser contexts: A sends → B receives via SSE within 500 ms
- Edit propagates as `message.edited`; delete propagates as `message.deleted`
- Reaction add/remove round-trips
- Thread: child message excluded from main list, included in thread panel
- Mention notifies the right user (highlight + unread)
- Attachment: upload → message renders image inline
- Unread badge clears on `markReadAction`

**Manual checklist (before flipping the flag):**
- Multi-tab same user — no duplicate renders
- SSE reconnects after dropping wifi for 30 s
- Course-channel auto-add on new course assignment
- Search returns nothing for non-member conversations even with matching text

## 14. Known limitations and follow-ups

- **Single-instance only.** The in-process `EventEmitter` doesn't fan out
  across Node processes. Phase 1.5 ops: add a Postgres `LISTEN/NOTIFY` bridge
  before scaling Azure App Service beyond one container.
- **No moderation tooling.** Admins can soft-delete any message via a
  service-role action (not exposed in UI in Phase 1). No reporting flow.
- **No email or push notifications.** Unread badges are visible only inside
  the app. Phase 2.
- **Attachments accumulate.** Soft-deleted attachments live in R2 for 30 days
  with no automated sweep — Phase 1.5 ops.
- **OIDC interaction.** The chat hub does not depend on the OIDC cutover; it
  reads `requireProfile()` and works under either auth provider.
