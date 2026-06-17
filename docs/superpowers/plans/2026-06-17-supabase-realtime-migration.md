# Supabase Realtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three polling/EventEmitter systems with Supabase Realtime — Presence (in-memory Map + HTTP polling → Realtime Presence), Chat (EventEmitter + SSE → Realtime Broadcast), and Notifications (15s interval poll → Realtime Broadcast trigger + 60s fallback).

**Architecture:** The Supabase browser client (`lib/supabase/client.ts`) already handles missing env vars gracefully (returns `null`). All three migrations follow the same null-guard pattern: if `createClient()` returns null, fall back to a no-op or longer-interval safety net rather than crashing. Server-side broadcast uses the Supabase REST `/realtime/v1/api/broadcast` endpoint with the service role key — no persistent WebSocket needed from server functions. The app uses its own auth (not Supabase Auth), so the browser client operates as the anon role; Presence and Broadcast don't require RLS grants.

**Tech Stack:** `@supabase/supabase-js` (already installed), Next.js Server Actions, Node.js `fetch` for server-side REST broadcast

## Global Constraints

- Never import server-only modules (`"server-only"`, `getPostgresPool`, `lib/auth/context`) in client components or `'use client'` files.
- Keep `createClient()` from `lib/supabase/client.ts` as the sole browser Supabase factory — do not inline `createSupabaseClient(...)` elsewhere.
- Keep the `OnlineUser`, `trackOnlinePresence`, and `subscribeToOnlineUsers` public API signatures identical so `OnlinePresenceTracker` and other callers require no changes.
- The Supabase REST broadcast endpoint: `POST ${NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast` with `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` and `apikey: ${SUPABASE_SERVICE_ROLE_KEY}` headers.
- Active integration branch: `master`. Never push to `main`.
- Run `pnpm typecheck` from `apps/web` before each commit to catch TypeScript errors.

---

## File Map

### Task 1 — Presence

| Action | Path |
|--------|------|
| Modify | `apps/web/lib/online-presence.ts` |
| Delete | `apps/web/lib/presence/store.ts` |
| Delete | `apps/web/app/api/presence/heartbeat/route.ts` |
| Delete | `apps/web/app/api/presence/online/route.ts` |
| Unchanged | `apps/web/components/providers/online-presence-tracker.tsx` |

### Task 2 — Chat Broadcast

| Action | Path |
|--------|------|
| Create | `apps/web/lib/chat/realtime.ts` |
| Modify | `apps/web/lib/chat/service.ts` |
| Modify | `apps/web/app/(dashboard)/chat/_components/ChatSseClient.tsx` |
| Keep (fallback) | `apps/web/app/api/chat/stream/[conversationId]/route.ts` |
| Delete | `apps/web/lib/chat/events.ts` |
| Update test | `apps/web/lib/chat/__tests__/events.test.ts` |

### Task 3 — Notification Broadcast

| Action | Path |
|--------|------|
| Create | `apps/web/lib/notifications/realtime.ts` |
| Modify | `apps/web/components/providers/notification-provider.tsx` |
| Modify | `apps/web/lib/chat/service.ts` (add notification broadcast on sendMessage) |

---

## Task 1: Presence via Supabase Realtime Presence

**Files:**
- Modify: `apps/web/lib/online-presence.ts`
- Delete: `apps/web/lib/presence/store.ts`, `app/api/presence/heartbeat/route.ts`, `app/api/presence/online/route.ts`

**Interfaces:**
- Produces: `trackOnlinePresence(user: Omit<OnlineUser, 'online_at'>): () => void` — unchanged signature
- Produces: `subscribeToOnlineUsers(listener: (users: OnlineUser[]) => void): () => void` — unchanged signature
- Produces: `type OnlineUser = { userId: string; name: string | null; email: string; role: string; online_at: string }` — unchanged

- [ ] **Step 1: Verify the current public API contract**

Read `apps/web/lib/online-presence.ts` and confirm the exported functions and types match the signatures above. Read `apps/web/components/providers/online-presence-tracker.tsx` to confirm it only calls `trackOnlinePresence`.

Expected: `trackOnlinePresence` ignores its argument (currently doesn't pass it to the heartbeat); `subscribeToOnlineUsers` manages a module-level listener set. No other callers should need changes.

- [ ] **Step 2: Replace `lib/online-presence.ts` with Supabase Realtime Presence**

Full replacement — keep the same exported API, delete all HTTP polling internals:

```typescript
// apps/web/lib/online-presence.ts
'use client'

import { createClient } from '@/lib/supabase/client'

export type OnlineUser = {
  userId: string
  name: string | null
  email: string
  role: string
  online_at: string
}

type PresencePayload = OnlineUser & { presence_ref: string }
type Listener = (users: OnlineUser[]) => void

let presenceChannel: ReturnType<NonNullable<ReturnType<typeof createClient>>['channel']> | null = null
let latestUsers: OnlineUser[] = []
const listeners = new Set<Listener>()

function emitUsers() {
  for (const l of listeners) l(latestUsers)
}

function ensureChannel() {
  if (presenceChannel) return presenceChannel
  const supabase = createClient()
  if (!supabase) return null

  presenceChannel = supabase.channel('online-users')
  presenceChannel.on('presence', { event: 'sync' }, () => {
    if (!presenceChannel) return
    const raw = presenceChannel.presenceState<OnlineUser>()
    latestUsers = (Object.values(raw).flat() as PresencePayload[]).map(
      ({ presence_ref: _ref, ...user }) => user,
    )
    emitUsers()
  })
  presenceChannel.subscribe()
  return presenceChannel
}

export function trackOnlinePresence(user: Omit<OnlineUser, 'online_at'>) {
  const ch = ensureChannel()
  if (!ch) return () => {}

  const payload: OnlineUser = { ...user, online_at: new Date().toISOString() }
  void ch.track(payload)

  return () => {
    void ch.untrack()
  }
}

export function subscribeToOnlineUsers(listener: Listener) {
  listeners.add(listener)
  listener(latestUsers)
  ensureChannel()

  return () => {
    listeners.delete(listener)
  }
}
```

- [ ] **Step 3: Delete the three server-side presence files**

```bash
rm apps/web/lib/presence/store.ts
rm apps/web/app/api/presence/heartbeat/route.ts
rm apps/web/app/api/presence/online/route.ts
```

If there is an `apps/web/app/api/presence/` directory and it's now empty, remove it too:
```bash
rmdir apps/web/app/api/presence/heartbeat apps/web/app/api/presence/online apps/web/app/api/presence 2>/dev/null || true
```

- [ ] **Step 4: Check for remaining imports of deleted files**

```bash
cd apps/web && grep -r "presence/store\|api/presence" --include="*.ts" --include="*.tsx" -l
```

Expected: no output. If any files import from `lib/presence/store` or reference the deleted API routes, update them to remove those imports.

- [ ] **Step 5: TypeScript check**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -40
```

Expected: no new errors. If `presenceState<OnlineUser>()` causes a type error, cast: `const raw = presenceChannel.presenceState() as Record<string, PresencePayload[]>`.

- [ ] **Step 6: Smoke-test presence**

Start the dev server: `pnpm dev` from the repo root. Open two browser tabs, both logged in as different users. Open the admin "Online" indicator (if present) or watch network tab — confirm no requests to `/api/presence/heartbeat` or `/api/presence/online` are made. Both tabs should show each other as online via the Supabase Realtime Presence channel (check the Supabase dashboard → Realtime → Inspector if available).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/online-presence.ts
git add -u apps/web/lib/presence/store.ts apps/web/app/api/presence/heartbeat/route.ts apps/web/app/api/presence/online/route.ts
git commit -m "feat: replace presence polling with Supabase Realtime Presence channel"
```

---

## Task 2: Chat via Supabase Realtime Broadcast

**Files:**
- Create: `apps/web/lib/chat/realtime.ts`
- Modify: `apps/web/lib/chat/service.ts`
- Modify: `apps/web/app/(dashboard)/chat/_components/ChatSseClient.tsx`
- Delete: `apps/web/lib/chat/events.ts`
- Update: `apps/web/lib/chat/__tests__/events.test.ts` → delete or replace

**Interfaces:**
- Consumes from Task 1: nothing (independent)
- Produces: `broadcastChatEvent(conversationId: string, event: string, payload: unknown): Promise<void>` — server-only utility
- The `ChatSseClient` public props signature is unchanged: `{ conversationId: string; currentUserId: string; initialMessages: MessageRow[] }`

**Why we keep the SSE route:** On single-instance deployments (Docker/AzDO), the EventEmitter bus works. If `NEXT_PUBLIC_SUPABASE_URL` is not set, the client falls back to the SSE route. This avoids a hard regression on non-Vercel deploys.

- [ ] **Step 1: Create `lib/chat/realtime.ts` — server-side broadcast utility**

```typescript
// apps/web/lib/chat/realtime.ts
import "server-only"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export async function broadcastChatEvent(
  conversationId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      messages: [{ topic: `chat:${conversationId}`, event, payload }],
    }),
  }).catch((err) => {
    console.warn("[broadcastChatEvent] broadcast failed:", err)
  })
}
```

- [ ] **Step 2: Verify the test for `events.ts` before deleting**

Read `apps/web/lib/chat/__tests__/events.test.ts`. It tests `events.publish` / `events.subscribe` on the in-memory bus. These will be deleted. Note any test assertions we should preserve in a new form.

Expected: simple tests that the bus can publish and subscribers receive. We don't need to port these — the Realtime channel is tested by Supabase's own infrastructure.

- [ ] **Step 3: Update `lib/chat/service.ts` — replace `events.publish` with `broadcastChatEvent`**

Current `service.ts` calls `events.publish(conversationId, type, payload)` in five places. Replace all five. The `broadcastChatEvent` is async; use `void` to avoid blocking the action return.

Full updated `lib/chat/service.ts`:

```typescript
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
```

- [ ] **Step 4: Update `ChatSseClient.tsx` — subscribe to Supabase Broadcast with SSE fallback**

Replace only the `useEffect` that opens the EventSource. The reducer, state, and JSX are unchanged.

```typescript
"use client";
import { useEffect, useMemo, useReducer } from "react";
import type { MessageRow } from "@/lib/chat/types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { createClient } from "@/lib/supabase/client";

type State = { messages: Map<string, MessageRow> };
type Action =
  | { type: "ready" }
  | { type: "message"; payload: MessageRow }
  | { type: "message.edited"; payload: { id: string; body: string; editedAt: string } }
  | { type: "message.deleted"; payload: { id: string; deletedAt: string } }
  | { type: "reaction.added" | "reaction.removed"; payload: { messageId: string; userId: string; emoji: string } };

function reducer(state: State, a: Action): State {
  const next = new Map(state.messages);
  switch (a.type) {
    case "message": {
      next.set(a.payload.id, { ...a.payload, reactions: a.payload.reactions ?? [], attachments: a.payload.attachments ?? [] });
      break;
    }
    case "message.edited": {
      const m = next.get(a.payload.id); if (m) next.set(m.id, { ...m, body: a.payload.body, editedAt: a.payload.editedAt });
      break;
    }
    case "message.deleted": {
      const m = next.get(a.payload.id); if (m) next.set(m.id, { ...m, body: "", deletedAt: a.payload.deletedAt });
      break;
    }
    case "reaction.added": {
      const m = next.get(a.payload.messageId); if (!m) break;
      const idx = m.reactions.findIndex((r) => r.emoji === a.payload.emoji);
      const updated = idx >= 0
        ? m.reactions.map((r, i) => i === idx ? { ...r, userIds: [...new Set([...r.userIds, a.payload.userId])] } : r)
        : [...m.reactions, { emoji: a.payload.emoji, userIds: [a.payload.userId] }];
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
    case "reaction.removed": {
      const m = next.get(a.payload.messageId); if (!m) break;
      const updated = m.reactions
        .map((r) => r.emoji === a.payload.emoji ? { ...r, userIds: r.userIds.filter((u) => u !== a.payload.userId) } : r)
        .filter((r) => r.userIds.length > 0);
      next.set(m.id, { ...m, reactions: updated });
      break;
    }
  }
  return { messages: next };
}

const BROADCAST_EVENTS = ["message", "message.edited", "message.deleted", "reaction.added", "reaction.removed"] as const;
type BroadcastEventType = (typeof BROADCAST_EVENTS)[number];

export function ChatSseClient(props: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
}) {
  const [state, dispatch] = useReducer(reducer, {
    messages: new Map(props.initialMessages.map((m) => [m.id, m])),
  });

  useEffect(() => {
    const supabase = createClient();

    if (supabase) {
      const channel = supabase.channel(`chat:${props.conversationId}`)
      for (const event of BROADCAST_EVENTS) {
        channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
          dispatch({ type: event as BroadcastEventType, payload } as Action)
        })
      }
      channel.subscribe()
      return () => { void supabase.removeChannel(channel) }
    }

    // Fallback: SSE (single-instance deployments without Supabase configured)
    const es = new EventSource(`/api/chat/stream/${props.conversationId}`);
    for (const t of BROADCAST_EVENTS) {
      es.addEventListener(t, (ev) => dispatch({ type: t, payload: JSON.parse((ev as MessageEvent).data) } as Action));
    }
    return () => es.close();
  }, [props.conversationId]);

  const messages = useMemo(
    () => [...state.messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.messages],
  );

  return (
    <>
      <ConversationHeader conversationId={props.conversationId} />
      <MessageList messages={messages} currentUserId={props.currentUserId} />
      <Composer conversationId={props.conversationId} />
    </>
  );
}
```

- [ ] **Step 5: Delete `lib/chat/events.ts` and its test**

```bash
rm apps/web/lib/chat/events.ts
rm apps/web/lib/chat/__tests__/events.test.ts
```

- [ ] **Step 6: Check for remaining imports of `events.ts`**

```bash
cd apps/web && grep -r "chat/events\|from.*events" lib/chat/ --include="*.ts" --include="*.tsx" -l
```

Expected: no output. If service.ts still has `import { events }`, that's a bug — verify the full file was replaced in Step 3.

- [ ] **Step 7: TypeScript check**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -40
```

Expected: no errors. Common issues:
- `channel.on("broadcast", ...)` type mismatch — cast payload as `{ payload: unknown }` and dispatch with `as Action`
- `broadcastChatEvent` not found — verify the import path in `service.ts` is `"./realtime"`

- [ ] **Step 8: Smoke-test chat**

Start `pnpm dev`. Open a chat conversation in two browser tabs. Send a message in one tab. Confirm it appears in the other tab without page reload. Check the Supabase dashboard → Realtime → Inspector to confirm broadcast events are flowing on the `chat:{conversationId}` channel.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/chat/realtime.ts apps/web/lib/chat/service.ts
git add "apps/web/app/(dashboard)/chat/_components/ChatSseClient.tsx"
git add -u apps/web/lib/chat/events.ts apps/web/lib/chat/__tests__/events.test.ts
git commit -m "feat: replace chat EventEmitter+SSE with Supabase Realtime Broadcast"
```

---

## Task 3: Notifications via Supabase Realtime Broadcast

**Files:**
- Create: `apps/web/lib/notifications/realtime.ts`
- Modify: `apps/web/components/providers/notification-provider.tsx`
- Modify: `apps/web/lib/chat/service.ts` (add notification broadcast on `sendMessage`)

**Interfaces:**
- Consumes from Task 2: `broadcastChatEvent` pattern (copy the same REST broadcast pattern)
- Produces: `broadcastNotificationEvent(userId: string): Promise<void>` — server-only utility
- The `NotificationProvider` public props are unchanged: `{ children, userId, role }`

**Architecture note:** The notification feed data comes from the secure `/api/notifications/feed` server endpoint. Supabase Realtime Broadcast on `notifications:{userId}` is used only as a **trigger signal** — it carries no sensitive data (empty payload). When the signal fires, the client immediately re-polls the feed. A 60s fallback interval catches any missed broadcasts. This avoids the need for Postgres Changes grants or Supabase RLS since Broadcast doesn't require table-level permissions.

- [ ] **Step 1: Create `lib/notifications/realtime.ts`**

```typescript
// apps/web/lib/notifications/realtime.ts
import "server-only"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

/**
 * Signal a specific user that their notification feed has changed.
 * The client subscribes to this channel and re-polls /api/notifications/feed
 * when it fires. Payload is intentionally empty — data comes from the API.
 */
export async function broadcastNotificationEvent(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      messages: [{ topic: `notifications:${userId}`, event: "new", payload: {} }],
    }),
  }).catch((err) => {
    console.warn("[broadcastNotificationEvent] broadcast failed:", err)
  })
}
```

- [ ] **Step 2: Wire notification broadcast into chat `sendMessage`**

When a user sends a chat message, other conversation members need a notification signal. Read `apps/web/lib/chat/service.ts` (already updated in Task 2) and add a notification broadcast for the sender's interlocutors.

We need the conversation member list to broadcast to each of them. Add a helper that fetches member IDs and broadcasts:

Add to `apps/web/lib/chat/service.ts`:

```typescript
// At the top, add import:
import { broadcastNotificationEvent } from "@/lib/notifications/realtime"
import * as membership from "./membership"

// At the bottom of sendMessage(), after the broadcastChatEvent call:
void repo.getConversationMemberIds(input.conversationId).then((memberIds) => {
  for (const memberId of memberIds) {
    if (memberId !== input.authorId) {
      void broadcastNotificationEvent(memberId)
    }
  }
})
```

Check if `repo.getConversationMemberIds` exists in `lib/chat/repository.ts`:

```bash
grep -n "getConversationMemberIds\|member.*ids\|memberIds" apps/web/lib/chat/repository.ts
```

If it doesn't exist, add it to `lib/chat/repository.ts`:

```typescript
export async function getConversationMemberIds(conversationId: string): Promise<string[]> {
  const { rows } = await pool.query<{ profile_id: string }>(
    `SELECT profile_id FROM conversation_members WHERE conversation_id = $1`,
    [conversationId],
  )
  return rows.map((r) => r.profile_id)
}
```

(where `pool` is `getPostgresPool()` — match the pattern used elsewhere in `repository.ts`)

- [ ] **Step 3: Update `NotificationProvider` to subscribe to Broadcast and reduce poll interval**

Replace only the `useEffect` that sets up polling. Keep the audio, dedup, and `showNotification` logic unchanged.

Key changes:
1. Add Supabase Broadcast subscription on `notifications:{userId}` → immediately call `pollFeed()`
2. Change poll interval from `15000` to `60000` (60s fallback)
3. Add `visibilitychange` listener → immediately call `pollFeed()` on tab focus

```typescript
// Inside the useEffect block (the second one, after the audio init one)
// Replace from: `async function pollFeed() {` to the end of the useEffect

  // --- (keep existing pollFeed, dedup, iconFor, labelFor, showNotification unchanged) ---

  async function pollFeed() {
    try {
      const response = await fetch('/api/notifications/feed', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = (await response.json()) as NotificationFeedResponse
      const items = data.notifications ?? []
      if (!initialLoadDone.current) {
        for (const item of items) seenIds.current.add(item.id)
        initialLoadDone.current = true
        pendingCountRef.current = data.pendingCount
        return
      }
      const newItems = items.filter((item) => dedup(item.id))
      for (const item of newItems.slice(0, 3).reverse()) showNotification(item)
      if (pendingCountRef.current !== null && pendingCountRef.current !== data.pendingCount) {
        router.refresh()
      }
      pendingCountRef.current = data.pendingCount
    } catch {
      // Best-effort polling only.
    }
  }

  void pollFeed()

  // 60s fallback poll (Realtime Broadcast is the primary trigger)
  const timer = window.setInterval(() => { void pollFeed() }, 60_000)

  // Immediately re-poll when tab regains focus
  const handleVisibility = () => { if (document.visibilityState === "visible") void pollFeed() }
  document.addEventListener("visibilitychange", handleVisibility)

  // Supabase Realtime Broadcast subscription
  let realtimeCleanup: (() => void) | null = null
  const { createClient } = await import("@/lib/supabase/client").catch(() => ({ createClient: () => null }))
  const supabase = createClient?.()
  if (supabase && userId) {
    const channel = supabase.channel(`notifications:${userId}`)
    channel.on("broadcast", { event: "new" }, () => { void pollFeed() })
    channel.subscribe()
    realtimeCleanup = () => { void supabase.removeChannel(channel) }
  }

  return () => {
    window.clearInterval(timer)
    document.removeEventListener("visibilitychange", handleVisibility)
    realtimeCleanup?.()
  }
```

**Note on dynamic import:** `notification-provider.tsx` is a `"use client"` file but `createClient` is also `"use client"`. Static import is fine — use a regular import at the top of the file:

```typescript
import { createClient } from "@/lib/supabase/client"
```

Then inside the useEffect:
```typescript
const supabase = createClient()
if (supabase && userId) {
  const channel = supabase.channel(`notifications:${userId}`)
  channel.on("broadcast", { event: "new" }, () => { void pollFeed() })
  channel.subscribe()
  realtimeCleanup = () => { void supabase.removeChannel(channel) }
}
```

Full updated `notification-provider.tsx` (only the imports and second `useEffect` change — paste the whole file to avoid partial edits):

The imports block: add `import { createClient } from "@/lib/supabase/client"` at the top alongside the existing imports.

The second `useEffect` `return` statement: change from:
```typescript
const timer = window.setInterval(() => { void pollFeed() }, 15000)
return () => { window.clearInterval(timer) }
```
to:
```typescript
void pollFeed()
const timer = window.setInterval(() => { void pollFeed() }, 60_000)

const handleVisibility = () => {
  if (document.visibilityState === "visible") void pollFeed()
}
document.addEventListener("visibilitychange", handleVisibility)

let realtimeCleanup: (() => void) | null = null
const supabase = createClient()
if (supabase && userId) {
  const channel = supabase.channel(`notifications:${userId}`)
  channel.on("broadcast", { event: "new" }, () => { void pollFeed() })
  channel.subscribe()
  realtimeCleanup = () => { void supabase.removeChannel(channel) }
}

return () => {
  window.clearInterval(timer)
  document.removeEventListener("visibilitychange", handleVisibility)
  realtimeCleanup?.()
}
```

- [ ] **Step 4: Check `repository.ts` for `getConversationMemberIds` and add if missing**

```bash
grep -n "getConversationMemberIds\|conversation_members" apps/web/lib/chat/repository.ts | head -10
```

If the function is missing, find where `getPostgresPool()` is imported and where similar queries are, then append:

```typescript
export async function getConversationMemberIds(conversationId: string): Promise<string[]> {
  const pool = getPostgresPool()
  const { rows } = await pool.query<{ profile_id: string }>(
    `SELECT profile_id FROM conversation_members WHERE conversation_id = $1`,
    [conversationId],
  )
  return rows.map((r) => r.profile_id)
}
```

Verify the table name by checking an existing query in `repository.ts` that references conversation membership.

- [ ] **Step 5: TypeScript check**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -40
```

Expected: no errors. Common issues:
- `realtimeCleanup` might need `let realtimeCleanup: (() => void) | null = null` to be in scope before the async branch — move the declaration before the `if (supabase)` block
- `channel.on("broadcast", { event: "new" }, ...)` callback type — cast as `() => void` if needed

- [ ] **Step 6: Smoke-test notifications**

Start `pnpm dev`. Open two browser tabs — one as a TA, one as an admin. In the TA tab, trigger a status change (or send a chat message in a shared conversation). The admin tab should receive a notification within ~1 second (via Broadcast) rather than waiting up to 15s. Verify in the Supabase dashboard → Realtime → Inspector that `notifications:{userId}` broadcast events are firing.

Verify the fallback: disconnect from the internet briefly and reconnect — the next 60s fallback poll should resume.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/notifications/realtime.ts
git add apps/web/lib/chat/service.ts
git add apps/web/components/providers/notification-provider.tsx
# If repository.ts was modified:
git add apps/web/lib/chat/repository.ts
git commit -m "feat: add Supabase Realtime Broadcast trigger for notification feed"
```

---

## Self-Review

**Spec coverage:**
- [x] Presence: in-memory Map deleted, HTTP polling deleted, Supabase Presence channel wired (Task 1)
- [x] Chat: EventEmitter deleted, SSE kept as fallback, Broadcast wired server→client (Task 2)
- [x] Notifications: 15s poll → 60s + Broadcast trigger + visibilitychange (Task 3)
- [x] All three have null-guards when Supabase env vars are not set
- [x] Public API signatures for `trackOnlinePresence` / `subscribeToOnlineUsers` unchanged

**Type consistency across tasks:**
- `broadcastChatEvent(conversationId, event, payload)` created in Task 2, used in Task 2 only
- `broadcastNotificationEvent(userId)` created in Task 3, used in Task 3 only
- `getConversationMemberIds(conversationId)` created in Task 3, used in `service.ts` Task 3 step

**Placeholder scan:**
- All code blocks are complete
- No "implement later" / "TBD" entries

**One edge case to watch:** The `sendMessage` notification broadcast (Task 3 Step 2) fires `void` after the action returns. If `getConversationMemberIds` throws (e.g., missing table), the error is swallowed silently. The existing `broadcastChatEvent` pattern uses `.catch(console.warn)` — apply the same to the member lookup.
