# Course-Chat Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Courses" tab to the `/chat` hub that lists every course a participant can access which has "Chat with Instructor" activity (who last messaged + preview + unanswered-question count), where clicking a course opens its Q&A thread inline to read/reply, with an "Open course" link.

**Architecture:** A new cohesive read layer (`CourseChatRepository` → `course-chat` service) aggregates `course_comments` (visibility `instructor_visible`) per course, scoped by the same `AccessibleCourseScope` the `/courses` list uses. The hub `Sidebar` (a server component) fetches this alongside the messenger conversation list and hands both to a new client `ChatSidebarTabs`. A static route `/chat/course/[courseId]` renders a `CourseCommentThread` that reuses the existing `CourseChatPanel` + shared server actions + realtime hook. The messenger (System A) is untouched.

**Tech Stack:** Next.js App Router (RSC + server actions), TypeScript, node-postgres via `getPostgresPool()`, Vitest (node env), Supabase Realtime broadcast, Tailwind + shadcn/ui primitives.

## Global Constraints

- **Branch:** work on `ft-course-chat-inbox`. Never commit to `master`.
- **Test location:** new tests MUST live at `apps/web/lib/<area>/__tests__/<name>.test.ts` — the `apps/web/vitest.config.ts` glob is `lib/**/__tests__/**/*.test.ts`; tests elsewhere are NOT collected by `npm test`/turbo.
- **Test style:** Vitest, `environment: "node"`. DB code is tested by mocking the pool: `vi.mock("@/lib/postgres/pool", () => ({ getPostgresPool: () => ({ query: mockQuery }) }))` and asserting SQL text (regex) + bound params + row mapping. There is **no** component/DOM test harness in this repo (no testing-library, no jsdom) — UI tasks are verified with `npx tsc --noEmit` plus a manual smoke check, not automated component tests.
- **Run one test file (from `apps/web`):** `npx vitest run <relpath>`. Run all: `npm test` (repo root, via turbo).
- **Typecheck (the repo's `lint`):** from `apps/web`, `npx tsc --noEmit`.
- **Timestamps:** node-pg returns `timestamptz` columns as JS `Date`. Convert to ISO with `new Date(value).toISOString()` (handles both `Date` and `string`). Do not use `parseISO`/`.split`.
- **Aggregate `visibility = 'instructor_visible'` only** — that is exactly the set `getSharedComments` renders in the thread, so counts match what the user sees.
- **Reuse, do not modify,** the existing server actions `postSharedCommentAction` / `markAnsweredAction`, the service `getSharedComments`, the broadcast `broadcastCourseCommentEvent`, and the hook `useCourseCommentRealtime`.

---

### Task 1: Model — `CourseChatRepository` (inbox aggregation + access check)

**Files:**
- Create: `apps/web/lib/repositories/postgres/course-chat-repository.ts`
- Modify: `apps/web/lib/repositories/contracts.ts` (add `CourseChatInboxItem` type + `CourseChatRepository` interface)
- Modify: `apps/web/lib/repositories/index.ts` (add `getCourseChatRepository()` singleton)
- Test: `apps/web/lib/repositories/postgres/__tests__/course-chat-repository.test.ts`

**Interfaces:**
- Consumes: `getPostgresPool()` from `@/lib/postgres/pool`; `AccessibleCourseScope` from `@/lib/repositories/contracts`.
- Produces:
  - `type CourseChatInboxItem = { courseId: string; courseTitle: string; lastActivityAt: string; lastPreview: string | null; lastAuthorName: string | null; unansweredCount: number }`
  - `interface CourseChatRepository { listCourseChatInbox(scope: AccessibleCourseScope): Promise<CourseChatInboxItem[]>; isCourseAccessible(scope: AccessibleCourseScope, courseId: string): Promise<boolean> }`
  - `createPostgresCourseChatRepository(): CourseChatRepository`
  - `getCourseChatRepository(): CourseChatRepository`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/repositories/postgres/__tests__/course-chat-repository.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("@/lib/postgres/pool", () => ({
  getPostgresPool: () => ({ query: mockQuery }),
}));

import { createPostgresCourseChatRepository } from "../course-chat-repository";

beforeEach(() => mockQuery.mockReset());

describe("listCourseChatInbox", () => {
  it("aggregates unanswered count + last activity and maps rows (Date -> ISO)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          course_id: "c1",
          course_title: "Bio 101",
          last_activity_at: new Date("2026-07-10T00:00:00Z"),
          unanswered_count: 2,
          last_preview: "when is the exam?",
          last_author_name: "Jane Doe",
        },
      ],
    });
    const repo = createPostgresCourseChatRepository();
    const result = await repo.listCourseChatInbox({ kind: "all" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/GROUP BY course_id/);
    expect(sql).toMatch(/FILTER \(WHERE is_question AND NOT is_answered\)/);
    expect(sql).toMatch(/visibility = 'instructor_visible'/);
    expect(sql).toMatch(/ORDER BY agg\.last_activity_at DESC/);
    expect(params).toEqual([]);
    expect(result).toEqual([
      {
        courseId: "c1",
        courseTitle: "Bio 101",
        lastActivityAt: "2026-07-10T00:00:00.000Z",
        lastPreview: "when is the exam?",
        lastAuthorName: "Jane Doe",
        unansweredCount: 2,
      },
    ]);
  });

  it("adds an assignment EXISTS predicate + params for scoped roles", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    await repo.listCourseChatInbox({ kind: "assigned", profileId: "p1", role: "instructor" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(
      /EXISTS \(SELECT 1 FROM course_assignments ca WHERE ca\.course_id = c\.id AND ca\.profile_id = \$1 AND ca\.role = \$2\)/,
    );
    expect(params).toEqual(["p1", "instructor"]);
  });

  it("omits the assignment predicate for kind:all", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    await repo.listCourseChatInbox({ kind: "all" });
    expect(mockQuery.mock.calls[0][0]).not.toMatch(/course_assignments/);
  });
});

describe("isCourseAccessible", () => {
  it("returns true when a row is returned (kind:all -> id only)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ok: true }] });
    const repo = createPostgresCourseChatRepository();
    const ok = await repo.isCourseAccessible({ kind: "all" }, "c1");
    expect(ok).toBe(true);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/FROM courses c WHERE c\.id = \$1/);
    expect(params).toEqual(["c1"]);
  });

  it("returns false with an assignment predicate for scoped roles", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = createPostgresCourseChatRepository();
    const ok = await repo.isCourseAccessible(
      { kind: "assigned", profileId: "p1", role: "staff" },
      "c1",
    );
    expect(ok).toBe(false);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(
      /course_assignments ca WHERE ca\.course_id = c\.id AND ca\.profile_id = \$2 AND ca\.role = \$3/,
    );
    expect(params).toEqual(["c1", "p1", "staff"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/web`): `npx vitest run lib/repositories/postgres/__tests__/course-chat-repository.test.ts`
Expected: FAIL — `Cannot find module '../course-chat-repository'`.

- [ ] **Step 3: Add the contract types**

In `apps/web/lib/repositories/contracts.ts`, add the `CourseChatInboxItem` type next to `CourseComment` (after line ~276), and the `CourseChatRepository` interface next to `CommentRepository` (after line ~490):

```ts
export type CourseChatInboxItem = {
  courseId: string;
  courseTitle: string;
  /** ISO timestamp of the most recent instructor-visible comment. */
  lastActivityAt: string;
  lastPreview: string | null;
  lastAuthorName: string | null;
  unansweredCount: number;
};

export interface CourseChatRepository {
  listCourseChatInbox(scope: AccessibleCourseScope): Promise<CourseChatInboxItem[]>;
  isCourseAccessible(scope: AccessibleCourseScope, courseId: string): Promise<boolean>;
}
```

(`AccessibleCourseScope` is already defined in this file at lines 101-103, so no new import is needed.)

- [ ] **Step 4: Implement the repository**

Create `apps/web/lib/repositories/postgres/course-chat-repository.ts`:

```ts
import { getPostgresPool } from "@/lib/postgres/pool";
import type {
  AccessibleCourseScope,
  CourseChatInboxItem,
  CourseChatRepository,
} from "@/lib/repositories/contracts";

type InboxRow = {
  course_id: string;
  course_title: string;
  last_activity_at: string | Date;
  last_preview: string | null;
  last_author_name: string | null;
  unanswered_count: number;
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Builds the `AND EXISTS (...)` course-scope predicate, mirroring
 * course-repository's buildAccessibleWhere. Returns an empty string (all
 * courses) for the `all` scope. For the `assigned` scope it appends the
 * profileId + role to `params` and references them by their 1-based position.
 */
function scopePredicate(scope: AccessibleCourseScope, params: unknown[]): string {
  if (scope.kind !== "assigned") return "";
  params.push(scope.profileId, scope.role);
  return `AND EXISTS (SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id AND ca.profile_id = $${params.length - 1} AND ca.role = $${params.length})`;
}

export function createPostgresCourseChatRepository(): CourseChatRepository {
  return {
    async listCourseChatInbox(scope) {
      const pool = getPostgresPool();
      const params: unknown[] = [];
      const predicate = scopePredicate(scope, params);
      const { rows } = await pool.query<InboxRow>(
        `
          SELECT
            c.id           AS course_id,
            c.title        AS course_title,
            agg.last_activity_at,
            agg.unanswered_count,
            lm.body        AS last_preview,
            lm.author_name AS last_author_name
          FROM courses c
          JOIN (
            SELECT
              course_id,
              MAX(created_at) AS last_activity_at,
              COUNT(*) FILTER (WHERE is_question AND NOT is_answered)::int AS unanswered_count
            FROM course_comments
            WHERE visibility = 'instructor_visible'
            GROUP BY course_id
          ) agg ON agg.course_id = c.id
          LEFT JOIN LATERAL (
            SELECT co.body, p.full_name AS author_name
            FROM course_comments co
            LEFT JOIN profiles p ON p.id = co.author_id
            WHERE co.course_id = c.id AND co.visibility = 'instructor_visible'
            ORDER BY co.created_at DESC
            LIMIT 1
          ) lm ON true
          WHERE TRUE ${predicate}
          ORDER BY agg.last_activity_at DESC
        `,
        params,
      );

      return rows.map((row) => ({
        courseId: row.course_id,
        courseTitle: row.course_title,
        lastActivityAt: toIso(row.last_activity_at),
        lastPreview: row.last_preview,
        lastAuthorName: row.last_author_name,
        unansweredCount: row.unanswered_count,
      }));
    },

    async isCourseAccessible(scope, courseId) {
      const pool = getPostgresPool();
      const params: unknown[] = [courseId];
      const predicate = scopePredicate(scope, params);
      const { rows } = await pool.query<{ ok: boolean }>(
        `SELECT TRUE AS ok FROM courses c WHERE c.id = $1 ${predicate} LIMIT 1`,
        params,
      );
      return rows.length > 0;
    },
  };
}
```

- [ ] **Step 5: Register the singleton**

In `apps/web/lib/repositories/index.ts`: add `CourseChatRepository` to the `import type { ... }` block, add the factory import, the module-level `let`, and the getter.

Add to the type import list:
```ts
  CourseChatRepository,
```
Add after the other factory imports:
```ts
import { createPostgresCourseChatRepository } from "./postgres/course-chat-repository";
```
Add after the other `let ... = null;` lines:
```ts
let courseChatRepository: CourseChatRepository | null = null;
```
Add after `getEscalationRepository`:
```ts
export function getCourseChatRepository(): CourseChatRepository {
  courseChatRepository ??= createPostgresCourseChatRepository();
  return courseChatRepository;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run (from `apps/web`): `npx vitest run lib/repositories/postgres/__tests__/course-chat-repository.test.ts`
Expected: PASS (5 tests). Then `npx tsc --noEmit` → no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/repositories/postgres/course-chat-repository.ts \
        apps/web/lib/repositories/contracts.ts \
        apps/web/lib/repositories/index.ts \
        apps/web/lib/repositories/postgres/__tests__/course-chat-repository.test.ts
git commit -m "feat(course-chat): inbox aggregation + access-check repository"
```

---

### Task 2: Service — `getCourseChatInbox()` + `canAccessCourseChat()`

**Files:**
- Modify: `apps/web/lib/courses/service.ts` (export the existing private `resolveAccessibleScope`)
- Create: `apps/web/lib/services/course-chat.ts`
- Test: `apps/web/lib/services/__tests__/course-chat.test.ts`

**Interfaces:**
- Consumes: `resolveAccessibleScope()` from `@/lib/courses/service` (returns `{ scope: AccessibleCourseScope | null; canExport: boolean }`); `getCourseChatRepository()` from `@/lib/repositories`.
- Produces:
  - `getCourseChatInbox(): Promise<CourseChatInboxItem[]>`
  - `canAccessCourseChat(courseId: string): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/services/__tests__/course-chat.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockResolveScope = vi.fn();
const mockListInbox = vi.fn();
const mockIsAccessible = vi.fn();

vi.mock("@/lib/courses/service", () => ({
  resolveAccessibleScope: mockResolveScope,
}));
vi.mock("@/lib/repositories", () => ({
  getCourseChatRepository: () => ({
    listCourseChatInbox: mockListInbox,
    isCourseAccessible: mockIsAccessible,
  }),
}));
vi.mock("server-only", () => ({}));

import { getCourseChatInbox, canAccessCourseChat } from "../course-chat";

beforeEach(() => {
  mockResolveScope.mockReset();
  mockListInbox.mockReset();
  mockIsAccessible.mockReset();
});

describe("getCourseChatInbox", () => {
  it("passes the resolved scope to the repository and returns its result", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: { kind: "all" }, canExport: true });
    mockListInbox.mockResolvedValueOnce([{ courseId: "c1" }]);
    const result = await getCourseChatInbox();
    expect(mockListInbox).toHaveBeenCalledWith({ kind: "all" });
    expect(result).toEqual([{ courseId: "c1" }]);
  });

  it("returns [] when there is no scope (anonymous / missing profile)", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: null, canExport: false });
    expect(await getCourseChatInbox()).toEqual([]);
    expect(mockListInbox).not.toHaveBeenCalled();
  });
});

describe("canAccessCourseChat", () => {
  it("delegates to repo.isCourseAccessible with scope + courseId", async () => {
    mockResolveScope.mockResolvedValueOnce({
      scope: { kind: "assigned", profileId: "p1", role: "instructor" },
      canExport: false,
    });
    mockIsAccessible.mockResolvedValueOnce(true);
    expect(await canAccessCourseChat("c1")).toBe(true);
    expect(mockIsAccessible).toHaveBeenCalledWith(
      { kind: "assigned", profileId: "p1", role: "instructor" },
      "c1",
    );
  });

  it("returns false when there is no scope", async () => {
    mockResolveScope.mockResolvedValueOnce({ scope: null, canExport: false });
    expect(await canAccessCourseChat("c1")).toBe(false);
    expect(mockIsAccessible).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/web`): `npx vitest run lib/services/__tests__/course-chat.test.ts`
Expected: FAIL — `Cannot find module '../course-chat'`.

- [ ] **Step 3: Export `resolveAccessibleScope`**

In `apps/web/lib/courses/service.ts` (line ~163), change:
```ts
async function resolveAccessibleScope(): Promise<{
```
to:
```ts
export async function resolveAccessibleScope(): Promise<{
```
(No other change — internal callers keep working.)

- [ ] **Step 4: Implement the service**

Create `apps/web/lib/services/course-chat.ts`:

```ts
import "server-only";

import { resolveAccessibleScope } from "@/lib/courses/service";
import { getCourseChatRepository } from "@/lib/repositories";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

/**
 * All courses the current user can access that have "Chat with Instructor"
 * (instructor_visible) activity, most-recent first. Empty when there is no
 * authenticated profile.
 */
export async function getCourseChatInbox(): Promise<CourseChatInboxItem[]> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) return [];
  return getCourseChatRepository().listCourseChatInbox(scope);
}

/** Whether the current user may open the course-chat thread for `courseId`. */
export async function canAccessCourseChat(courseId: string): Promise<boolean> {
  const { scope } = await resolveAccessibleScope();
  if (!scope) return false;
  return getCourseChatRepository().isCourseAccessible(scope, courseId);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run (from `apps/web`): `npx vitest run lib/services/__tests__/course-chat.test.ts`
Expected: PASS (4 tests). Then `npx tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/courses/service.ts \
        apps/web/lib/services/course-chat.ts \
        apps/web/lib/services/__tests__/course-chat.test.ts
git commit -m "feat(course-chat): inbox + access service over accessible-course scope"
```

---

### Task 3: View — "Messages | Courses" tabs in the hub Sidebar

**Files:**
- Create: `apps/web/app/(dashboard)/chat/_components/ChatSidebarTabs.tsx`
- Modify: `apps/web/app/(dashboard)/chat/_components/Sidebar.tsx`

**Interfaces:**
- Consumes: `getCourseChatInbox()` (Task 2); `listConversationsForUser` (existing); `ConversationSummary` from `@/lib/chat/types`; `CourseChatInboxItem` from `@/lib/repositories/contracts`; `RelativeTime`, `Badge`, `ScrollArea`, `cn`.
- Produces: `ChatSidebarTabs` client component; each Courses row links to `/chat/course/${courseId}` (route built in Task 4).

*No automated test — this repo has no component-test harness. Verify with `npx tsc --noEmit` + a manual smoke check.*

- [ ] **Step 1: Create the tabs client component**

Create `apps/web/app/(dashboard)/chat/_components/ChatSidebarTabs.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./RelativeTime";
import type { ConversationSummary } from "@/lib/chat/types";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

export function ChatSidebarTabs({
  conversations,
  courseChats,
}: {
  conversations: ConversationSummary[];
  courseChats: CourseChatInboxItem[];
}) {
  const [tab, setTab] = useState<"messages" | "courses">("messages");
  const unansweredTotal = courseChats.reduce((n, c) => n + c.unansweredCount, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-border">
        <TabButton active={tab === "messages"} onClick={() => setTab("messages")}>
          Messages
        </TabButton>
        <TabButton active={tab === "courses"} onClick={() => setTab("courses")}>
          Courses
          {unansweredTotal > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unansweredTotal}
            </Badge>
          )}
        </TabButton>
      </div>
      <ScrollArea className="flex-1">
        {tab === "messages" ? (
          <MessagesList conversations={conversations} />
        ) : (
          <CoursesList courseChats={courseChats} />
        )}
      </ScrollArea>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 px-3 py-2 text-sm font-medium",
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MessagesList({ conversations }: { conversations: ConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No conversations yet.
      </p>
    );
  }
  return (
    <ul>
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/${c.id}`}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40"
          >
            <span className="flex-1 truncate text-sm">{c.displayTitle}</span>
            <RelativeTime
              iso={c.lastMessageAt}
              className="shrink-0 text-xs text-muted-foreground"
            />
            {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CoursesList({ courseChats }: { courseChats: CourseChatInboxItem[] }) {
  if (courseChats.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No course chats yet.
      </p>
    );
  }
  return (
    <ul>
      {courseChats.map((c) => (
        <li key={c.courseId}>
          <Link
            href={`/chat/course/${c.courseId}`}
            className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm font-medium">{c.courseTitle}</span>
              <RelativeTime
                iso={c.lastActivityAt}
                className="shrink-0 text-xs text-muted-foreground"
              />
              {c.unansweredCount > 0 && <Badge variant="secondary">{c.unansweredCount}</Badge>}
            </div>
            {c.lastPreview && (
              <span className="truncate text-xs text-muted-foreground">
                {c.lastAuthorName ? `${c.lastAuthorName}: ` : ""}
                {c.lastPreview}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Rewire the Sidebar to fetch both lists and render the tabs**

Replace the full contents of `apps/web/app/(dashboard)/chat/_components/Sidebar.tsx` with:

```tsx
import { listConversationsForUser } from "@/lib/chat/queries";
import { getCourseChatInbox } from "@/lib/services/course-chat";
import { SidebarSearch } from "./SidebarSearch";
import { NewConversationMenu } from "./NewConversationMenu";
import { ChatWithAdminButton } from "./ChatWithAdminButton";
import { ChatSidebarTabs } from "./ChatSidebarTabs";

export async function Sidebar({
  currentUserId,
  canRequestSupport,
}: {
  currentUserId: string;
  canRequestSupport: boolean;
}) {
  const [conversations, courseChats] = await Promise.all([
    listConversationsForUser(currentUserId),
    getCourseChatInbox(),
  ]);
  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Chat</span>
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <NewConversationMenu />
        </div>
      </div>
      {canRequestSupport && (
        <div className="border-b border-border px-3 py-2">
          <ChatWithAdminButton />
        </div>
      )}
      <ChatSidebarTabs conversations={conversations} courseChats={courseChats} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: no errors. (Links to `/chat/course/...` will 404 until Task 4 — that is expected here.)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(dashboard)/chat/_components/ChatSidebarTabs.tsx" \
        "apps/web/app/(dashboard)/chat/_components/Sidebar.tsx"
git commit -m "feat(course-chat): Messages | Courses tabs in the chat hub sidebar"
```

---

### Task 4: Inline thread — `/chat/course/[courseId]` route + `CourseCommentThread`

**Files:**
- Create: `apps/web/app/(dashboard)/chat/course/[courseId]/page.tsx`
- Create: `apps/web/app/(dashboard)/chat/_components/CourseCommentThread.tsx` (server)
- Create: `apps/web/app/(dashboard)/chat/_components/CourseCommentThreadClient.tsx` (client)

**Interfaces:**
- Consumes: `requireProfile()`; `canAccessCourseChat()` (Task 2); `getSharedComments()` from `@/lib/services/comments`; `CourseChatPanel` (named export) from `@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel`; `useCourseCommentRealtime` from `@/lib/workspace/use-course-comment-realtime`; `Role`, `CourseComment` types.
- Produces: the `/chat/course/[courseId]` page; reusable `CourseCommentThread` server component.

*No automated test (no component-test harness). Verify with `npx tsc --noEmit` + manual smoke.*

- [ ] **Step 1: Create the client shell (realtime + panel + "Open course")**

Create `apps/web/app/(dashboard)/chat/_components/CourseCommentThreadClient.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CourseChatPanel } from "@/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel";
import { useCourseCommentRealtime } from "@/lib/workspace/use-course-comment-realtime";
import type { CourseComment } from "@/lib/services/comments";

export function CourseCommentThreadClient({
  courseId,
  currentUserId,
  comments,
  canPost,
  canMarkAnswered,
  openCourseHref,
}: {
  courseId: string;
  currentUserId: string;
  comments: CourseComment[];
  canPost: boolean;
  canMarkAnswered: boolean;
  openCourseHref: string;
}) {
  const router = useRouter();
  useCourseCommentRealtime(courseId, () => router.refresh());

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end border-b border-border px-3 py-2">
        <Link
          href={openCourseHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          Open course
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <CourseChatPanel
          courseId={courseId}
          comments={comments}
          currentUserId={currentUserId}
          canPost={canPost}
          canMarkAnswered={canMarkAnswered}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the server wrapper (fetch + role gating + href)**

Create `apps/web/app/(dashboard)/chat/_components/CourseCommentThread.tsx`:

```tsx
import type { Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getSharedComments } from "@/lib/services/comments";
import { CourseCommentThreadClient } from "./CourseCommentThreadClient";

// Mirrors the allow-lists in shared-comment-actions.ts (server re-checks anyway;
// these only gate the UI affordances).
const CAN_POST: Role[] = ["instructor", "admin_full", "super_admin", "standard_user"];
const CAN_MARK_ANSWERED: Role[] = ["admin_full", "super_admin", "standard_user"];

function courseHrefForRole(role: Role, courseId: string): string {
  if (role === "instructor") return `/instructor/courses/${courseId}`;
  if (role === "standard_user") return `/courses/${courseId}`;
  return `/admin/courses/${courseId}`; // admin_full | admin_viewer | super_admin | provost
}

export async function CourseCommentThread({ courseId }: { courseId: string }) {
  const ctx = await requireProfile();
  const comments = await getSharedComments(courseId);
  const role = ctx.profile.role;

  return (
    <CourseCommentThreadClient
      courseId={courseId}
      currentUserId={ctx.userId}
      comments={comments}
      canPost={CAN_POST.includes(role)}
      canMarkAnswered={CAN_MARK_ANSWERED.includes(role)}
      openCourseHref={courseHrefForRole(role, courseId)}
    />
  );
}
```

- [ ] **Step 3: Create the route page (guarded)**

Create `apps/web/app/(dashboard)/chat/course/[courseId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/context";
import { canAccessCourseChat } from "@/lib/services/course-chat";
import { CourseCommentThread } from "../../_components/CourseCommentThread";

export default async function CourseChatPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireProfile();
  if (!(await canAccessCourseChat(courseId))) notFound();
  return <CourseCommentThread courseId={courseId} />;
}
```

- [ ] **Step 4: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: no errors. In particular confirm `CourseChatPanel`'s prop types (`courseId`, `comments`, `currentUserId`, `canPost`, `canMarkAnswered`) match the call in Step 1 — they are defined in `course-chat-panel.tsx` lines 31-37.

- [ ] **Step 5: Manual smoke check**

Start the app (`cd apps/web && npm run dev`) with a DB that has instructor-visible comments. As an instructor/admin: open `/chat`, click the **Courses** tab, click a course → confirm the thread renders in the content pane, a reply posts (composer), "Open course" navigates to the role-correct course page, and a comment posted elsewhere refreshes the thread (realtime). As a user with no access, hitting `/chat/course/<foreign-id>` directly → 404.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(dashboard)/chat/course/[courseId]/page.tsx" \
        "apps/web/app/(dashboard)/chat/_components/CourseCommentThread.tsx" \
        "apps/web/app/(dashboard)/chat/_components/CourseCommentThreadClient.tsx"
git commit -m "feat(course-chat): inline /chat/course/[courseId] thread with reply + open-course"
```

---

### Task 5: TA coverage — Courses tab in the TA dashboard chat

`standard_user` (TA) has no `/chat` nav item; chat is a tab in the TA dashboard. Add the same Courses list there. Because `TaChatTab` is rendered by a **client** shell (`ta-dashboard-shell.tsx:103`), load the inbox via a server action rather than threading a server-fetched prop through the shells.

**Files:**
- Create: `apps/web/lib/actions/course-chat-actions.ts`
- Modify: `apps/web/app/(dashboard)/ta/_components/ta-chat-tab.tsx`

**Interfaces:**
- Consumes: `getCourseChatInbox()` (Task 2); `CourseChatInboxItem`.
- Produces: `getCourseChatInboxAction(): Promise<CourseChatInboxItem[]>`; a Messages/Courses tab switch inside `TaChatTab` where Courses rows link to `/chat/course/${courseId}`.

*No automated test (no component-test harness). Verify with `npx tsc --noEmit` + manual smoke.*

- [ ] **Step 1: Add the server action**

Create `apps/web/lib/actions/course-chat-actions.ts`:

```ts
"use server";

import { getCourseChatInbox } from "@/lib/services/course-chat";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";

export async function getCourseChatInboxAction(): Promise<CourseChatInboxItem[]> {
  return getCourseChatInbox();
}
```

- [ ] **Step 2: Add a Messages/Courses switch to `TaChatTab`**

In `apps/web/app/(dashboard)/ta/_components/ta-chat-tab.tsx`:

1. Add imports at the top (with the other imports):
```tsx
import Link from "next/link";
import { useEffect } from "react";
import { getCourseChatInboxAction } from "@/lib/actions/course-chat-actions";
import type { CourseChatInboxItem } from "@/lib/repositories/contracts";
```
(Merge `useEffect` into the existing `import { useState } from "react"` → `import { useState, useEffect } from "react"`.)

2. Inside the component, after the existing `useState` hooks, add tab + course-list state and a lazy loader:
```tsx
  const [tab, setTab] = useState<"messages" | "courses">("messages");
  const [courseChats, setCourseChats] = useState<CourseChatInboxItem[] | null>(null);

  useEffect(() => {
    if (tab === "courses" && courseChats === null) {
      getCourseChatInboxAction().then(setCourseChats).catch(() => setCourseChats([]));
    }
  }, [tab, courseChats]);
```

3. In the returned JSX, inside the `<aside ...>` conversation-list column, insert a tab header directly under the existing `Chat`/`NewConversationMenu` header `<div>` and before the `<ChatWithAdminButton />` block:
```tsx
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setTab("messages")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium",
              tab === "messages"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setTab("courses")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium",
              tab === "courses"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Courses
          </button>
        </div>
```

4. Wrap the existing conversation `<ScrollArea>...</ScrollArea>` so it only shows on the Messages tab, and add the Courses list for the Courses tab. Replace the existing `<ScrollArea className="flex-1"> ... </ScrollArea>` block with:
```tsx
        {tab === "messages" ? (
          <ScrollArea className="flex-1">
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent-indigo-soft",
                      selectedId === c.id &&
                        "bg-accent-indigo-soft ring-1 ring-inset ring-accent-indigo-ring",
                    )}
                  >
                    <span className="flex-1 truncate text-sm">{c.displayTitle}</span>
                    <RelativeTime
                      iso={c.lastMessageAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    />
                    {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
                  </button>
                </li>
              ))}
              {conversations.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet.
                </li>
              )}
            </ul>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1">
            {courseChats === null ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : courseChats.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No course chats yet.
              </p>
            ) : (
              <ul>
                {courseChats.map((c) => (
                  <li key={c.courseId}>
                    <Link
                      href={`/chat/course/${c.courseId}`}
                      className="flex flex-col gap-0.5 px-3 py-2 hover:bg-accent-indigo-soft"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate text-sm font-medium">{c.courseTitle}</span>
                        <RelativeTime
                          iso={c.lastActivityAt}
                          className="shrink-0 text-xs text-muted-foreground"
                        />
                        {c.unansweredCount > 0 && (
                          <Badge variant="secondary">{c.unansweredCount}</Badge>
                        )}
                      </div>
                      {c.lastPreview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {c.lastAuthorName ? `${c.lastAuthorName}: ` : ""}
                          {c.lastPreview}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}
```

- [ ] **Step 3: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: no errors. (`cn`, `RelativeTime`, `Badge`, `ScrollArea` are already imported in this file.)

- [ ] **Step 4: Manual smoke check**

As a TA (`standard_user`): open the dashboard chat area, switch to **Courses** → the list loads (server action), shows only assigned courses with activity, and clicking one opens `/chat/course/<id>` where the TA can read/reply (post allowed; mark-answered allowed for `standard_user`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/course-chat-actions.ts \
        "apps/web/app/(dashboard)/ta/_components/ta-chat-tab.tsx"
git commit -m "feat(course-chat): Courses tab in the TA dashboard chat"
```

---

### Task 6: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run (repo root): `npm test`
Expected: PASS, including the two new files (`course-chat-repository.test.ts`, `course-chat.test.ts`).

- [ ] **Step 2: Typecheck the app**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end manual pass**

With a seeded DB, verify the full story for one instructor and one admin: `/chat` → Courses tab shows the right courses (author + preview + unanswered badge, most-recent first), click → inline read/reply, realtime refresh, "Open course" link, and 404 on a non-accessible `courseId`. Confirm the messenger **Messages** tab is unchanged.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin ft-course-chat-inbox
```

---

## Notes / decisions carried from the spec

- **Approach C is satisfied without a course-page refactor.** The existing per-course pages already share `CourseChatPanel` (3 call sites); the "single source of truth" is that component. `CourseCommentThread` is the hub-side wrapper that reuses it, so there is no regression refactor of the course pages. (`CourseConversation` is a *separate* escalation/internal-log feature and is intentionally left alone.)
- **Out of scope (YAGNI):** per-user unread tracking, merging with the messenger, editing/deleting from the hub, and a nav badge for course chats.
- **Plan-time facts verified against source:** `getPostgresPool` query signature; `course_comments` columns (`is_question`, `is_answered`, `visibility`, `created_at`); `AccessibleCourseScope` shape + `buildAccessibleWhere` EXISTS pattern; `resolveAccessibleScope` role→scope mapping; `requireProfile()` returning `{ userId, profile: { role, ... } }`; `CourseChatPanel` named export + props; `useCourseCommentRealtime(courseId, onInsert)`; Vitest node-env + mocked-pool testing convention + `lib/**/__tests__/` collection glob.
