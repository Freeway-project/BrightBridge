# Admin Status Override + Notification Dismissal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `admin_full` move a course between any two statuses with required reason + audit recording, notify the assigned TA, and add Hide / Clear-all controls to the `/notifications` page.

**Architecture:** Server actions guard via `requireProfile()` + role check. DB gets a `kind` column on `course_status_events` (override events flagged + reason required by check constraint) plus a new `dismissed_notifications` table. Notifications stay derived — `getNotificationsPageData()` gets a new override source and filters out dismissed ids.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, shadcn/ui (Dialog, Select, Textarea, Button), Vitest, Supabase Postgres (RLS enabled).

**Spec:** `docs/superpowers/specs/2026-06-10-admin-status-override-design.md`

---

## File Structure (decomposition lock-in)

**Workflow package (`packages/workflow/src`)**
- `transitions.ts` (modify) — add `isAdminOverride` + export
- `transitions.test.ts` (create) — unit tests for `isAdminOverride`

**Database (`supabase/migrations`)**
- `20260610000000_course_status_event_kind.sql` (create) — kind column + reason check
- `20260610000100_dismissed_notifications.sql` (create) — table + RLS

**Service layer (`apps/web/lib`)**
- `lib/services/course-status-override.ts` (create) — pure service: validates inputs, writes event + updates course; no Next.js dependencies
- `lib/services/course-status-override.test.ts` (create) — service tests (mocked Supabase client)
- `lib/notifications/queries.ts` (modify) — add `getRecentOverridesForTA` source + filter against `dismissed_notifications`
- `lib/notifications/dismissals.ts` (create) — small service for insert one / insert all

**Server actions / API routes (`apps/web/app`)**
- `(dashboard)/admin/courses/[id]/actions.ts` (modify) — add `overrideCourseStatusAction`
- `api/notifications/dismiss/route.ts` (create) — POST { id }
- `api/notifications/dismiss-all/route.ts` (create) — POST

**UI (`apps/web/app` + `apps/web/components`)**
- `(dashboard)/admin/courses/[id]/_components/status-override-dialog.tsx` (create) — modal + form
- `(dashboard)/admin/courses/[id]/_components/admin-course-sidebar.tsx` (modify) — render the trigger
- `(dashboard)/notifications/page.tsx` (modify) — extract row to client component, add Clear-all
- `(dashboard)/notifications/_components/notification-row-client.tsx` (create) — client wrapper with the Hide × button
- `(dashboard)/notifications/_components/clear-all-button.tsx` (create) — client Clear-all button
- `components/super-admin/audit-view.tsx` (modify) — render "Admin override" badge + reason for `kind='admin_override'` rows

---

## Task 1 — Add `isAdminOverride` helper to workflow package

**Files:**
- Modify: `packages/workflow/src/transitions.ts`
- Modify: `packages/workflow/src/index.ts`
- Create: `packages/workflow/src/transitions.test.ts`

- [ ] **Step 1.1: Write failing test**

Create `packages/workflow/src/transitions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isAdminOverride } from "./transitions";
import type { Role } from "./roles";

describe("isAdminOverride", () => {
  it("allows admin_full to jump between any two distinct statuses", () => {
    expect(isAdminOverride({ role: "admin_full", from: "final_approved", to: "ta_review_in_progress" })).toBe(true);
    expect(isAdminOverride({ role: "admin_full", from: "course_created", to: "final_approved" })).toBe(true);
  });

  it("allows super_admin to jump between any two distinct statuses", () => {
    expect(isAdminOverride({ role: "super_admin", from: "submitted_to_admin", to: "course_created" })).toBe(true);
  });

  it("rejects identical from/to", () => {
    expect(isAdminOverride({ role: "admin_full", from: "submitted_to_admin", to: "submitted_to_admin" })).toBe(false);
  });

  it.each<Role>(["admin_viewer", "standard_user", "instructor", "provost"])(
    "rejects non-admin role %s",
    (role) => {
      expect(isAdminOverride({ role, from: "submitted_to_admin", to: "waiting_on_admin" })).toBe(false);
    },
  );
});
```

- [ ] **Step 1.2: Run test, verify it fails**

Run: `pnpm -F @coursebridge/workflow test transitions.test.ts`
Expected: FAIL — `isAdminOverride is not exported`.

- [ ] **Step 1.3: Implement helper**

Append to `packages/workflow/src/transitions.ts` (after `transitionAllowsRole`):

```ts
const ADMIN_OVERRIDE_ROLES = ["admin_full", "super_admin"] as const satisfies readonly EffectiveRole[];

export function isAdminOverride({ role, from, to }: TransitionInput): boolean {
  if (from === to) return false;
  return (ADMIN_OVERRIDE_ROLES as readonly EffectiveRole[]).includes(role);
}
```

- [ ] **Step 1.4: Export from index**

Edit `packages/workflow/src/index.ts`. Add `isAdminOverride` to the export block that already lists `canTransition`:

```ts
export {
  assertCanTransition,
  canTransition,
  COURSE_TRANSITIONS,
  getAllowedTransitions,
  isAdminOverride,
  type AllowedTransitionsInput,
  type CourseTransition,
  type EffectiveRole,
  type TransitionInput
} from "./transitions";
```

- [ ] **Step 1.5: Run tests, verify pass**

Run: `pnpm -F @coursebridge/workflow test`
Expected: PASS — all tests green including the new file.

- [ ] **Step 1.6: Commit**

```bash
git add packages/workflow/src/transitions.ts packages/workflow/src/transitions.test.ts packages/workflow/src/index.ts
git commit -m "feat(workflow): add isAdminOverride helper

Lets admin_full and super_admin move a course between any two distinct
statuses. Used by a dedicated override server action; the canonical
COURSE_TRANSITIONS list is unchanged."
```

---

## Task 2 — DB migration: add `kind` to `course_status_events`

**Files:**
- Create: `supabase/migrations/20260610000000_course_status_event_kind.sql`

- [ ] **Step 2.1: Write migration**

Create `supabase/migrations/20260610000000_course_status_event_kind.sql`:

```sql
-- Tag status events as either a normal "transition" (default) or an
-- "admin_override" so the audit timeline can render them distinctly and
-- enforce a non-trivial reason on overrides.
--
-- Why a check constraint on the note: an override without a recorded reason
-- defeats the entire point of distinguishing it from a normal transition.
-- The server validates the reason at length >= 10 before hitting the DB;
-- this constraint is the last line of defence.

begin;

alter table public.course_status_events
  add column if not exists kind text not null default 'transition'
  check (kind in ('transition','admin_override'));

alter table public.course_status_events
  drop constraint if exists course_status_events_override_requires_note;

alter table public.course_status_events
  add constraint course_status_events_override_requires_note
  check (kind = 'transition' or (note is not null and length(trim(note)) >= 10));

comment on column public.course_status_events.kind is
  'Either ''transition'' (normal workflow step) or ''admin_override'' (admin moved the course outside the canonical transition graph). Overrides require a non-trivial note.';

commit;
```

- [ ] **Step 2.2: Apply to local dev DB**

Run: `pnpm supabase migration up` (or whatever the project script is — see `scripts/db-migrate-all.mjs`).
Expected: migration applies, no errors.

- [ ] **Step 2.3: Sanity-check schema**

Run: `psql $DATABASE_URL -c "\d public.course_status_events"`
Expected: `kind` column present with default `'transition'`; constraint `course_status_events_override_requires_note` listed.

- [ ] **Step 2.4: Commit**

```bash
git add supabase/migrations/20260610000000_course_status_event_kind.sql
git commit -m "feat(db): add kind column to course_status_events

Tags each status event as 'transition' or 'admin_override' so admin
override entries can be styled distinctly in the timeline. Adds a
check constraint that overrides must carry a >=10-char note."
```

---

## Task 3 — DB migration: `dismissed_notifications` table

**Files:**
- Create: `supabase/migrations/20260610000100_dismissed_notifications.sql`

- [ ] **Step 3.1: Write migration**

Create `supabase/migrations/20260610000100_dismissed_notifications.sql`:

```sql
-- Per-user notification dismissals. Notifications themselves are derived on
-- the fly from many sources (assignments, issues, comments, overrides), so
-- "hide" / "clear all" needs a side table that getNotificationsPageData()
-- filters against.

begin;

create table if not exists public.dismissed_notifications (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  notification_id text not null,
  dismissed_at    timestamptz not null default now(),
  primary key (user_id, notification_id)
);

comment on table public.dismissed_notifications is
  'Records each user''s dismissed synthetic notification ids (e.g. ''issue:<uuid>'', ''override:<uuid>''). getNotificationsPageData() filters items whose id is present here.';

create index if not exists dismissed_notifications_user_idx
  on public.dismissed_notifications (user_id, dismissed_at desc);

alter table public.dismissed_notifications enable row level security;

drop policy if exists dismissed_notifications_own_read on public.dismissed_notifications;
create policy dismissed_notifications_own_read on public.dismissed_notifications
  for select using (user_id = auth.uid());

drop policy if exists dismissed_notifications_own_insert on public.dismissed_notifications;
create policy dismissed_notifications_own_insert on public.dismissed_notifications
  for insert with check (user_id = auth.uid());

commit;
```

- [ ] **Step 3.2: Apply migration**

Run: `pnpm supabase migration up`
Expected: applies cleanly.

- [ ] **Step 3.3: Commit**

```bash
git add supabase/migrations/20260610000100_dismissed_notifications.sql
git commit -m "feat(db): add dismissed_notifications table

Per-user side table that getNotificationsPageData() filters against
when synthesizing notifications. Enables Hide / Clear-all on the
/notifications page without changing the derived-notifications model."
```

---

## Task 4 — Service: `overrideCourseStatus`

**Files:**
- Create: `apps/web/lib/services/course-status-override.ts`
- Create: `apps/web/lib/services/course-status-override.test.ts`

- [ ] **Step 4.1: Write failing test**

Create `apps/web/lib/services/course-status-override.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { overrideCourseStatus } from "./course-status-override";

function makeClient(overrides: Partial<{
  selectStatus: string;
  insertError: unknown;
  updateError: unknown;
}> = {}) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const client = {
    from(table: string) {
      if (table === "courses") {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => ({ data: { status: overrides.selectStatus ?? "submitted_to_admin" }, error: null }),
                };
              },
            };
          },
          update(payload: unknown) {
            return {
              eq() {
                updates.push(payload);
                return Promise.resolve({ error: overrides.updateError ?? null });
              },
            };
          },
        };
      }
      if (table === "course_status_events") {
        return {
          insert(payload: unknown) {
            inserts.push(payload);
            return Promise.resolve({ error: overrides.insertError ?? null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return { client, inserts, updates };
}

describe("overrideCourseStatus", () => {
  it("inserts an admin_override event and updates courses.status", async () => {
    const { client, inserts, updates } = makeClient({ selectStatus: "submitted_to_admin" });
    await overrideCourseStatus(client as never, {
      courseId: "c1",
      to: "ta_review_in_progress",
      reason: "Reverting to fix metadata",
      actorId: "u1",
      actorRole: "admin_full",
    });
    expect(inserts).toEqual([
      {
        course_id: "c1",
        from_status: "submitted_to_admin",
        to_status: "ta_review_in_progress",
        actor_id: "u1",
        actor_role: "admin_full",
        note: "Reverting to fix metadata",
        kind: "admin_override",
      },
    ]);
    expect(updates).toEqual([{ status: "ta_review_in_progress" }]);
  });

  it("rejects when target equals current status", async () => {
    const { client } = makeClient({ selectStatus: "submitted_to_admin" });
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "submitted_to_admin",
        reason: "Reverting to fix metadata",
        actorId: "u1",
        actorRole: "admin_full",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("rejects when reason is shorter than 10 chars after trim", async () => {
    const { client } = makeClient();
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "ta_review_in_progress",
        reason: "   short   ",
        actorId: "u1",
        actorRole: "admin_full",
      }),
    ).rejects.toThrow(/reason/i);
  });

  it("rejects when actor role is not allowed", async () => {
    const { client } = makeClient();
    await expect(
      overrideCourseStatus(client as never, {
        courseId: "c1",
        to: "ta_review_in_progress",
        reason: "Reverting to fix metadata",
        actorId: "u1",
        actorRole: "admin_viewer" as never,
      }),
    ).rejects.toThrow(/forbidden/i);
  });
});
```

- [ ] **Step 4.2: Run test, verify fail**

Run: `pnpm -F web test course-status-override.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement service**

Create `apps/web/lib/services/course-status-override.ts`:

```ts
import "server-only";
import { isAdminOverride, type CourseStatus, type Role } from "@coursebridge/workflow";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_REASON_LEN = 10;

export type OverrideInput = {
  courseId: string;
  to: CourseStatus;
  reason: string;
  actorId: string;
  actorRole: Role;
};

export async function overrideCourseStatus(client: SupabaseClient, input: OverrideInput) {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LEN) {
    throw new Error(`reason must be at least ${MIN_REASON_LEN} characters`);
  }

  const { data: course, error: readErr } = await client
    .from("courses")
    .select("status")
    .eq("id", input.courseId)
    .single();
  if (readErr) throw readErr;
  if (!course) throw new Error(`course ${input.courseId} not found`);

  const from = course.status as CourseStatus;
  if (!isAdminOverride({ role: input.actorRole, from, to: input.to })) {
    throw new Error("Forbidden: role cannot override status, or target equals current");
  }
  if (from === input.to) {
    throw new Error("Course is already in that status");
  }

  const { error: insertErr } = await client.from("course_status_events").insert({
    course_id: input.courseId,
    from_status: from,
    to_status: input.to,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    note: reason,
    kind: "admin_override",
  });
  if (insertErr) throw insertErr;

  const { error: updateErr } = await client
    .from("courses")
    .update({ status: input.to })
    .eq("id", input.courseId);
  if (updateErr) throw updateErr;
}
```

- [ ] **Step 4.4: Run tests, verify pass**

Run: `pnpm -F web test course-status-override.test.ts`
Expected: PASS all 4 cases.

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/lib/services/course-status-override.ts apps/web/lib/services/course-status-override.test.ts
git commit -m "feat(courses): service to override course status with audit

Validates role + reason, reads current status, inserts an
admin_override event, then updates courses.status. No Next.js or
auth deps — pure service consumed by the server action."
```

---

## Task 5 — Server action: `overrideCourseStatusAction`

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/courses/[id]/actions.ts`

- [ ] **Step 5.1: Append the action**

Add to the bottom of `apps/web/app/(dashboard)/admin/courses/[id]/actions.ts`:

```ts
import { overrideCourseStatus } from "@/lib/services/course-status-override"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import type { CourseStatus } from "@coursebridge/workflow"

const OVERRIDE_ROLES = new Set(["admin_full", "super_admin"])

export async function overrideCourseStatusAction(input: {
  courseId: string
  to: CourseStatus
  reason: string
}) {
  const profile = await requireProfile()
  if (profile.kind !== "profile" || !OVERRIDE_ROLES.has(profile.profile.role)) {
    throw new Error("Forbidden")
  }

  try {
    await overrideCourseStatus(getSupabaseAdminClientOrThrow(), {
      courseId: input.courseId,
      to: input.to,
      reason: input.reason,
      actorId: profile.profile.id,
      actorRole: profile.profile.role,
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_course_detail")
      scope.setTag("action", "override_course_status")
      scope.setContext("override", {
        actorId: profile.profile.id,
        courseId: input.courseId,
        to: input.to,
      })
      Sentry.captureException(err instanceof Error ? err : new Error("overrideCourseStatusAction failed"))
    })
    throw err
  }

  revalidatePath(`/admin/courses/${input.courseId}`)
  revalidatePath(`/admin`)
  revalidatePath(`/courses/${input.courseId}`)
}
```

(`requireProfile`, `Sentry`, `revalidatePath` are already imported at the top.)

- [ ] **Step 5.2: Typecheck**

Run: `pnpm -F web typecheck`
Expected: no errors.

- [ ] **Step 5.3: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/courses/\[id\]/actions.ts
git commit -m "feat(admin): overrideCourseStatusAction server action

Authz: admin_full or super_admin only. Delegates to the service,
revalidates the course pages."
```

---

## Task 6 — UI: status override dialog

**Files:**
- Create: `apps/web/app/(dashboard)/admin/courses/[id]/_components/status-override-dialog.tsx`

- [ ] **Step 6.1: Build the dialog**

Create the file:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  type CourseStatus,
} from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { overrideCourseStatusAction } from "../actions"

interface Props {
  courseId: string
  courseTitle: string
  currentStatus: CourseStatus
}

const MIN_REASON = 10

export function StatusOverrideDialog({ courseId, courseTitle, currentStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<CourseStatus | "">("")
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const reasonOk = reason.trim().length >= MIN_REASON
  const canSubmit = target !== "" && target !== currentStatus && reasonOk && !isPending

  function reset() {
    setTarget("")
    setReason("")
  }

  function onConfirm() {
    if (!canSubmit) return
    startTransition(async () => {
      try {
        await overrideCourseStatusAction({
          courseId,
          to: target as CourseStatus,
          reason: reason.trim(),
        })
        toast.success(`Moved to ${COURSE_STATUS_LABELS[target as CourseStatus]}`)
        setOpen(false)
        reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Override failed")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">Change status…</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move &quot;{courseTitle}&quot; from {COURSE_STATUS_LABELS[currentStatus]} to{" "}
            {target ? COURSE_STATUS_LABELS[target as CourseStatus] : "…"}?
          </DialogTitle>
          <DialogDescription>
            This is an admin override. It is recorded in the audit trail with your name and the reason below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New status</label>
            <Select value={target} onValueChange={(v) => setTarget(v as CourseStatus)}>
              <SelectTrigger><SelectValue placeholder="Pick a status…" /></SelectTrigger>
              <SelectContent>
                {COURSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} disabled={s === currentStatus}>
                    {COURSE_STATUS_LABELS[s]}{s === currentStatus ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Reason (required, min {MIN_REASON} chars)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this status change needed?"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">Recorded in the audit trail.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!canSubmit}>
            {isPending ? "Saving…" : "Confirm override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6.2: Verify Dialog primitives exist**

Run: `ls apps/web/components/ui/dialog.tsx`
If missing, run: `pnpm dlx shadcn@latest add dialog` and commit the generated file. Repeat for `textarea` if missing.

- [ ] **Step 6.3: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/courses/\[id\]/_components/status-override-dialog.tsx
git commit -m "feat(admin): status override dialog

Modal with status dropdown + required reason. Confirm button gated
until target picked and reason >= 10 chars. Calls
overrideCourseStatusAction and refreshes the page."
```

---

## Task 7 — Wire button into admin sidebar

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/courses/[id]/_components/admin-course-sidebar.tsx`

- [ ] **Step 7.1: Import and render**

In `admin-course-sidebar.tsx`, add to the import block at the top:

```tsx
import { StatusOverrideDialog } from "./status-override-dialog"
```

Find the block that renders the current status (look for `<StatusBadge` near the top of the JSX). Immediately after that block (or in the existing actions section of the sidebar — whichever already groups status-related controls), insert:

```tsx
<div className="mt-3">
  <StatusOverrideDialog
    courseId={course.id}
    courseTitle={course.title}
    currentStatus={course.status}
  />
</div>
```

(The dialog is visible to everyone who loads this sidebar. The server action gates by role, so non-admin users would get a `Forbidden` toast if they tried — acceptable since this page is already only routed to from `/admin/...`.)

- [ ] **Step 7.2: Typecheck**

Run: `pnpm -F web typecheck`
Expected: no errors.

- [ ] **Step 7.3: Smoke-test in dev**

Run: `pnpm -F web dev` and load `/admin/courses/<some-id>`. Click "Change status…". Confirm the dialog opens, dropdown lists all 13 statuses with current one disabled, Confirm enables only after target + ≥10-char reason. Pick a distant status, confirm, verify the status badge updates and a new entry appears in the course timeline.

- [ ] **Step 7.4: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/courses/\[id\]/_components/admin-course-sidebar.tsx
git commit -m "feat(admin): expose Change-status button in course sidebar"
```

---

## Task 8 — Notifications: add override source

**Files:**
- Modify: `apps/web/lib/notifications/queries.ts`

- [ ] **Step 8.1: Add the source + synthesis helper**

In `apps/web/lib/notifications/queries.ts`:

1. Extend the `NotificationKind` union to include `"status_override"`:

```ts
type NotificationKind = "assignment" | "course_action" | "issue" | "comment" | "support" | "status_override";
```

2. Below the other source fetchers (search for `async function getRecentReassignments`), add:

```ts
async function getRecentOverridesForUser(profileId: string) {
  // Override events where the current user is the assigned TA on that
  // course. Last 14 days only — older overrides shouldn't ring on the bell.
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("course_status_events")
    .select(`
      id, course_id, from_status, to_status, note, created_at, actor_role,
      actor:profiles!course_status_events_actor_id_fkey ( full_name ),
      courses!inner ( title, assignments:course_assignments!inner ( user_id, role ) )
    `)
    .eq("kind", "admin_override")
    .gte("created_at", since)
    .eq("courses.assignments.user_id", profileId)
    .eq("courses.assignments.role", "staff")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("notifications: override fetch failed", error);
    return [];
  }
  return data ?? [];
}

function overrideToNotification(row: {
  id: string;
  course_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
  actor: { full_name: string | null } | { full_name: string | null }[] | null;
  courses: { title: string | null } | { title: string | null }[] | null;
}): NotificationItem {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  const fromLabel = row.from_status
    ? getCourseStatusLabel(row.from_status as CourseStatus)
    : "—";
  const toLabel = getCourseStatusLabel(row.to_status as CourseStatus);
  return {
    id: `override:${row.id}`,
    kind: "status_override",
    tone: "warning",
    title: "Status changed by admin",
    description: `${actor?.full_name ?? "An admin"} moved this course from ${fromLabel} to ${toLabel}. Reason: ${row.note ?? "(none)"}`,
    courseTitle: course?.title ?? null,
    meta: "Admin override",
    href: `/courses/${row.course_id}`,
    createdAt: row.created_at,
    pending: true,
  };
}
```

3. Inside `getNotificationsPageData`, extend the `Promise.all` block (around line 130) to include overrides — note `admin` is the supabase client already in scope:

```ts
const [courses, issues, comments, supportMessages, reassignments, overrides] = await Promise.all([
  getRelevantCourses(accessibleCourseIds, role),
  getRelevantIssues(accessibleCourseIds),
  getRecentComments(accessibleCourseIds, context.profile.id),
  role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
  getRecentReassignments(context.profile.id, isAdmin),
  getRecentOverridesForUser(context.profile.id),
]);
```

4. Add overrides into the merge:

```ts
const notifications = [
  ...courses.map((course) => courseToNotification(course, role)),
  ...issues.map((issue) => issueToNotification(issue, role)),
  ...comments.map((comment) => commentToNotification(comment, role)),
  ...supportMessages.map(supportMessageToNotification),
  ...reassignments.map((r) => reassignmentToNotification(r, isAdmin)),
  ...overrides.map(overrideToNotification),
].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
```

- [ ] **Step 8.2: Add the dismissals filter**

Immediately after the `notifications.sort(...)` line, fetch dismissed ids and filter:

```ts
const dismissed = await admin
  .from("dismissed_notifications")
  .select("notification_id")
  .eq("user_id", context.profile.id);

const dismissedIds = new Set<string>(
  (dismissed.data ?? []).map((d: { notification_id: string }) => d.notification_id),
);
const filtered = notifications.filter((n) => !dismissedIds.has(n.id));

return {
  notifications: filtered,
  pendingCount: filtered.filter((item) => item.pending).length,
  role,
  error: false,
};
```

(Remove the previous `return { notifications, pendingCount: ... }` since `filtered` replaces it.)

- [ ] **Step 8.3: Update the notifications page KIND_LABEL list**

In `apps/web/app/(dashboard)/notifications/page.tsx`, add `status_override` to `KIND_LABEL` (so it groups under its own section in "All notifications"):

```ts
const KIND_LABEL: { kind: NotificationItem["kind"]; label: string }[] = [
  { kind: "status_override", label: "Admin overrides" },
  { kind: "course_action", label: "Course actions" },
  { kind: "assignment", label: "Assignments" },
  { kind: "issue", label: "Issues" },
  { kind: "comment", label: "Comments" },
  { kind: "support", label: "Support" },
];
```

Also add an icon for it in `KIND_ICON` — import `ShieldAlert` from `lucide-react` and:

```ts
const KIND_ICON = {
  assignment: Bell,
  course_action: Clock,
  issue: TriangleAlert,
  comment: MessageSquare,
  support: LifeBuoy,
  status_override: ShieldAlert,
};
```

- [ ] **Step 8.4: Typecheck**

Run: `pnpm -F web typecheck`
Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
git add apps/web/lib/notifications/queries.ts apps/web/app/\(dashboard\)/notifications/page.tsx
git commit -m "feat(notifications): admin override source + dismissals filter

New source surfaces admin status overrides (last 14d) to the
assigned TA. getNotificationsPageData() now filters out any
notification id present in dismissed_notifications for the caller."
```

---

## Task 9 — API: dismiss single

**Files:**
- Create: `apps/web/app/api/notifications/dismiss/route.ts`

- [ ] **Step 9.1: Implement route**

Create the file:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });

  const admin = getSupabaseAdminClientOrThrow();
  const { error } = await admin
    .from("dismissed_notifications")
    .upsert(
      { user_id: ctx.profile.id, notification_id: parsed.data.id },
      { onConflict: "user_id,notification_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("dismiss failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9.2: Commit**

```bash
git add apps/web/app/api/notifications/dismiss/route.ts
git commit -m "feat(notifications): POST /api/notifications/dismiss

Inserts a row into dismissed_notifications for the caller +
notification id. Idempotent via upsert."
```

---

## Task 10 — API: dismiss all

**Files:**
- Create: `apps/web/app/api/notifications/dismiss-all/route.ts`

- [ ] **Step 10.1: Implement route**

Create the file:

```ts
import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";
import { getNotificationsPageData } from "@/lib/notifications/queries";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireProfile();
  if (ctx.kind !== "profile") return NextResponse.json({ ok: false }, { status: 401 });

  const { notifications } = await getNotificationsPageData();
  if (notifications.length === 0) return NextResponse.json({ ok: true, dismissed: 0 });

  const admin = getSupabaseAdminClientOrThrow();
  const rows = notifications.map((n) => ({
    user_id: ctx.profile.id,
    notification_id: n.id,
  }));

  const { error } = await admin
    .from("dismissed_notifications")
    .upsert(rows, { onConflict: "user_id,notification_id", ignoreDuplicates: true });
  if (error) {
    console.error("dismiss-all failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, dismissed: rows.length });
}
```

- [ ] **Step 10.2: Commit**

```bash
git add apps/web/app/api/notifications/dismiss-all/route.ts
git commit -m "feat(notifications): POST /api/notifications/dismiss-all

Bulk-dismisses every currently-pending notification for the caller."
```

---

## Task 11 — UI: per-row Hide + Clear-all on /notifications

**Files:**
- Create: `apps/web/app/(dashboard)/notifications/_components/notification-row-client.tsx`
- Create: `apps/web/app/(dashboard)/notifications/_components/clear-all-button.tsx`
- Modify: `apps/web/app/(dashboard)/notifications/page.tsx`

- [ ] **Step 11.1: Create the per-row client wrapper**

Create `apps/web/app/(dashboard)/notifications/_components/notification-row-client.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function HideButton({ notificationId }: { notificationId: string }) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (hidden) return null

  function onHide() {
    startTransition(async () => {
      setHidden(true) // optimistic
      try {
        const res = await fetch("/api/notifications/dismiss", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: notificationId }),
        })
        if (!res.ok) throw new Error("dismiss failed")
        router.refresh()
      } catch {
        setHidden(false)
        toast.error("Couldn't hide notification")
      }
    })
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7"
      aria-label="Hide"
      onClick={onHide}
      disabled={isPending}
    >
      <X className="size-3.5" />
    </Button>
  )
}
```

- [ ] **Step 11.2: Create the Clear-all button**

Create `apps/web/app/(dashboard)/notifications/_components/clear-all-button.tsx`:

```tsx
"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ClearAllButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onClick() {
    if (!window.confirm("Hide all notifications? They will still appear in the audit trail.")) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications/dismiss-all", { method: "POST" })
        if (!res.ok) throw new Error("clear-all failed")
        router.refresh()
      } catch {
        toast.error("Couldn't clear notifications")
      }
    })
  }

  return (
    <Button variant="outline" size="sm" disabled={disabled || isPending} onClick={onClick}>
      {isPending ? "Clearing…" : "Clear all"}
    </Button>
  )
}
```

- [ ] **Step 11.3: Wire into the notifications page**

In `apps/web/app/(dashboard)/notifications/page.tsx`:

1. Add imports near the top:

```tsx
import { HideButton } from "./_components/notification-row-client"
import { ClearAllButton } from "./_components/clear-all-button"
```

2. In `NotificationRow`, replace the right-side button container with:

```tsx
<div className="flex items-start gap-1 sm:justify-end">
  <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
    <Link href={item.href}>
      <ExternalLink className="size-3.5" />
      Open
    </Link>
  </Button>
  <HideButton notificationId={item.id} />
</div>
```

3. In the page body, add a Clear-all button to the header of the "All notifications" Card. Replace its existing `CardTitle` content with:

```tsx
<CardTitle className="flex items-center justify-between gap-3 text-sm">
  <span>All notifications</span>
  <div className="flex items-center gap-2">
    <Badge variant="outline">{notifications.length}</Badge>
    <ClearAllButton disabled={notifications.length === 0} />
  </div>
</CardTitle>
```

- [ ] **Step 11.4: Smoke-test**

Run dev server, load `/notifications`. Click the × on a row → row vanishes, bell count drops on next poll (or immediately after `router.refresh()`). Click "Clear all" → confirm dialog → all rows clear. Reload — still empty (dismissals persisted).

- [ ] **Step 11.5: Commit**

```bash
git add apps/web/app/\(dashboard\)/notifications/_components/ apps/web/app/\(dashboard\)/notifications/page.tsx
git commit -m "feat(notifications): Hide and Clear-all controls

Per-row × button calls /api/notifications/dismiss. Header Clear-all
button (with window.confirm) calls /api/notifications/dismiss-all.
Optimistic UI + router.refresh() so the bell count updates."
```

---

## Task 12 — Timeline: render override badge

**Files:**
- Modify: `apps/web/components/super-admin/audit-view.tsx`

- [ ] **Step 12.1: Locate and update the status-event row renderer**

Open `apps/web/components/super-admin/audit-view.tsx`. Find the block that renders a `course_status_events` row (search for `from_status` and `to_status`). The row currently has columns for actor, from→to, and note.

Add a small badge component next to the from→to columns:

```tsx
{row.kind === "admin_override" && (
  <span className="ml-2 inline-flex items-center rounded border border-orange-400/30 bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-500">
    Admin override
  </span>
)}
```

If the row type doesn't include `kind`, extend the SQL `select(...)` for status events to add `kind` and the row TS type to include `kind: "transition" | "admin_override"`.

- [ ] **Step 12.2: Verify in dev**

Load `/super-admin` → Audit Trail tab. Confirm an admin override entry shows the orange "Admin override" badge and its reason (the `note` column) is visible.

- [ ] **Step 12.3: Commit**

```bash
git add apps/web/components/super-admin/audit-view.tsx
git commit -m "feat(audit): orange Admin override badge in timeline"
```

---

## Task 13 — End-to-end manual verification + open PR

- [ ] **Step 13.1: Full flow check**

With the dev server running:

1. Log in as an `admin_full` user. Open a course at `submitted_to_admin`.
2. Click "Change status…" → pick `final_approved`, reason "Skipping instructor review per registrar request". Confirm.
3. Verify the status badge updates to "Final Approved" and the course timeline shows the new entry with the orange badge + reason.
4. Log in as the assigned TA on that course. Open `/notifications` — confirm the override notification appears under "Admin overrides" with the right description.
5. Click ×. Confirm row disappears and bell count drops.
6. Refresh — still gone (persisted).
7. Trigger another override; on `/notifications`, click "Clear all". Confirm all rows clear.

- [ ] **Step 13.2: Push and open PR**

```bash
git push -u origin feat/admin-status-override
gh pr create --title "feat(admin): full-access status override + notification dismissal" --body "$(cat <<'EOF'
## Summary
- admin_full can move a course from any status to any status with required reason
- Override entries flagged in course_status_events (new kind column) and rendered with an orange badge in the timeline
- Assigned TA gets an in-app notification when their course is overridden
- /notifications page gets per-row Hide and Clear-all controls backed by a new dismissed_notifications table

## Test plan
- [ ] admin_full overrides a course from final_approved → ta_review_in_progress (reason recorded)
- [ ] super_admin can still do the same
- [ ] standard_user / instructor cannot (server action throws Forbidden)
- [ ] Reason shorter than 10 chars is rejected client and server side
- [ ] Assigned TA sees the override on /notifications
- [ ] Hide × removes the row, persists across reload
- [ ] Clear all empties the list, persists across reload
- [ ] Audit timeline shows orange "Admin override" badge + reason

Spec: \`docs/superpowers/specs/2026-06-10-admin-status-override-design.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 13.3: Final commit (only if any leftover changes)**

```bash
git status
# if anything uncommitted, commit it with a focused message
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| `isAdminOverride(role, from, to)` helper | 1 |
| Migration A: `kind` column + reason check | 2 |
| Migration B: `dismissed_notifications` table + RLS | 3 |
| `overrideCourseStatus` service | 4 |
| `overrideCourseStatusAction` server action with role check | 5 |
| Override dialog (dropdown + reason ≥10) | 6 |
| Sidebar trigger button | 7 |
| New override notification source + dismissals filter | 8 |
| `POST /api/notifications/dismiss` | 9 |
| `POST /api/notifications/dismiss-all` | 10 |
| Per-row Hide × + Clear-all UI | 11 |
| Orange "Admin override" badge in timeline | 12 |
| End-to-end manual flow + PR | 13 |
