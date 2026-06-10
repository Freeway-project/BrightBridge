# Course Reassignment (Admin & Super Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins and super admins reassign one or many courses from their current TA to a different TA, transaction-safely, with a durable audit trace and notifications to the new TA and admins.

**Architecture:** A single Postgres RPC (`reassign_course_staff`) swaps the staff row in place and writes a `course_reassignments` trace row in one transaction (all-or-nothing). A service function → server actions (single + batch) → a reassign dialog wired into the existing admin courses table drive it. The trace row is added to the realtime publication and surfaced both as a derived notification and a realtime toast for the new TA and admins.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres (service-role client + `rpc`), TypeScript, React + shadcn/ui + Sonner, Supabase Realtime.

**Verification reality:** `apps/web` has no unit-test harness; verification is `pnpm typecheck` (root, runs `tsc --noEmit` per package) plus `pnpm build`, with explicit manual SQL/UI smoke tests where noted. The RPC is verified with a real SQL transaction test. Do NOT invent a vitest suite for `apps/web`.

**Role terminology reminder:** profile role `standard_user` == assignment role `staff` == "TA" in UI copy. Admin roles for this feature: `admin_full`, `super_admin`. Super admins reach `/admin` directly (the `/admin` page guard allows `["admin_full","super_admin"]`), so the admin-table entry point covers both roles — no separate super-admin surface is needed.

---

## File Structure

| File | Responsibility | Create/Modify |
| --- | --- | --- |
| `supabase/migrations/20260605000100_course_reassignment.sql` | `course_reassignments` table, `reassign_course_staff` RPC, RLS, realtime | Create |
| `apps/web/lib/repositories/contracts.ts` | `ReassignCourseStaffRecordInput` type + `reassignCourseStaff` on `CourseRepository` | Modify |
| `apps/web/lib/repositories/supabase/course-repository.ts` | `reassignCourseStaff` impl (calls RPC) | Modify |
| `apps/web/lib/courses/service.ts` | `reassignCourseStaff` service function | Modify |
| `apps/web/app/(dashboard)/admin/actions.ts` | `reassignCourseAction` + `batchReassignCourseAction` | Modify |
| `apps/web/app/(dashboard)/admin/_components/reassign-dialog.tsx` | Reassign dialog (TA picker + reason) | Create |
| `apps/web/app/(dashboard)/admin/_components/assigned-courses-table.tsx` | Per-row + bulk "Reassign" entry points | Modify |
| `apps/web/lib/notifications/queries.ts` | `getRecentReassignments` → notification items | Modify |
| `apps/web/components/providers/notification-provider.tsx` | Realtime toast on `course_reassignments` insert | Modify |

---

## Task 1: Database migration — trace table + transactional RPC

**Files:**
- Create: `supabase/migrations/20260605000100_course_reassignment.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260605000100_course_reassignment.sql`:

```sql
-- Course reassignment: swap a course's TA (staff) atomically and keep a durable
-- trace. WHY a dedicated table + RPC (not the generic audit_log trigger):
--   * audit_log records actor via auth.uid(), which is NULL for our service-role
--     writes — so "who reassigned" would be lost there. This table captures the
--     actor (reassigned_by) and an optional reason explicitly.
--   * The swap is delete-old-implied + add-new; doing it as one in-place UPDATE
--     inside one transaction guarantees a course is never left without a TA.
-- The generic audit_log trigger on course_assignments still fires on top of this.

begin;

-- 1. Trace table -----------------------------------------------------------
create table if not exists public.course_reassignments (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  from_profile_id  uuid references public.profiles(id) on delete set null,
  to_profile_id    uuid not null references public.profiles(id) on delete set null,
  reassigned_by    uuid references public.profiles(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now()
);

comment on table public.course_reassignments is
  'Durable trace of course TA reassignments (who/from/to/when/why). Written only by reassign_course_staff(); also the source for reassignment notifications.';

create index if not exists course_reassignments_to_created_idx
  on public.course_reassignments (to_profile_id, created_at desc);
create index if not exists course_reassignments_course_created_idx
  on public.course_reassignments (course_id, created_at desc);

alter table public.course_reassignments enable row level security;

-- Admins read all; a TA reads rows where they are the new assignee.
drop policy if exists course_reassignments_admin_read on public.course_reassignments;
create policy course_reassignments_admin_read on public.course_reassignments
  for select using (public.is_admin_role());

drop policy if exists course_reassignments_assignee_read on public.course_reassignments;
create policy course_reassignments_assignee_read on public.course_reassignments
  for select using (to_profile_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER RPC writes.

-- 2. Transactional swap RPC ------------------------------------------------
create or replace function public.reassign_course_staff(
  p_course_id      uuid,
  p_new_profile_id uuid,
  p_actor_id       uuid,
  p_reason         text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_profile_id uuid;
begin
  -- Lock the current staff row so concurrent reassigns serialize.
  select profile_id into v_old_profile_id
  from public.course_assignments
  where course_id = p_course_id and role = 'staff'
  for update;

  if v_old_profile_id is null then
    raise exception 'Course has no current TA to reassign';
  end if;

  if v_old_profile_id = p_new_profile_id then
    raise exception 'Course is already assigned to this TA';
  end if;

  -- In-place swap: atomic, preserves the one-staff-per-course invariant, and the
  -- audit_log UPDATE trigger fires with old/new profile_id.
  update public.course_assignments
  set profile_id  = p_new_profile_id,
      assigned_by = p_actor_id,
      assigned_at = now()
  where course_id = p_course_id and role = 'staff';

  insert into public.course_reassignments
    (course_id, from_profile_id, to_profile_id, reassigned_by, reason)
  values
    (p_course_id, v_old_profile_id, p_new_profile_id, p_actor_id, nullif(btrim(p_reason), ''));
end;
$$;

-- Only the service role (server actions) may execute it; the app-layer
-- requireAnyRole check is the authorization gate.
revoke all on function public.reassign_course_staff(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reassign_course_staff(uuid, uuid, uuid, text) to service_role;

-- 3. Realtime: let clients subscribe to reassignment inserts for toasts.
alter publication supabase_realtime add table public.course_reassignments;

commit;
```

- [ ] **Step 2: Apply the migration to the dev database**

Run (use the project's dev DB connection — the same `DATABASE_URL`/pooler used by `scripts/mirror-to-dev.sh`; if `psql` is unavailable locally use the Docker form below):

```bash
docker run --rm -i postgres:17-alpine psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 \
  < supabase/migrations/20260605000100_course_reassignment.sql
```

Expected: `BEGIN … CREATE TABLE … CREATE FUNCTION … ALTER PUBLICATION … COMMIT` with no error.

- [ ] **Step 3: Manual SQL verification of the RPC (the real test)**

Run this transactional check against the dev DB. It picks a course that currently has a TA, reassigns it to a different `standard_user`, asserts the swap + trace, then rolls back so nothing persists:

```sql
begin;
-- pick a course with a current staff assignment
with c as (
  select course_id, profile_id as old_ta
  from public.course_assignments where role = 'staff' limit 1
), newta as (
  select p.id as new_ta from public.profiles p
  where p.role = 'standard_user'
    and p.id <> (select old_ta from c) limit 1
)
select public.reassign_course_staff(
  (select course_id from c), (select new_ta from newta),
  (select new_ta from newta), 'SQL smoke test');

-- assert: staff row now points at the new TA, and a trace row exists
select profile_id as staff_now from public.course_assignments
  where course_id = (select course_id from public.course_reassignments order by created_at desc limit 1)
    and role = 'staff';
select from_profile_id, to_profile_id, reassigned_by, reason
  from public.course_reassignments order by created_at desc limit 1;
rollback;
```

Expected: `staff_now` equals the new TA id; the trace row shows the expected from/to/by and `reason = 'SQL smoke test'`. Then verify the error paths:

```sql
-- same-TA must raise
select public.reassign_course_staff(
  (select course_id from public.course_assignments where role='staff' limit 1),
  (select profile_id from public.course_assignments where role='staff' limit 1),
  (select profile_id from public.course_assignments where role='staff' limit 1), null);
```

Expected: `ERROR: Course is already assigned to this TA`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260605000100_course_reassignment.sql
git commit -m "feat(db): course_reassignments trace + reassign_course_staff RPC"
```

---

## Task 2: Repository method

**Files:**
- Modify: `apps/web/lib/repositories/contracts.ts` (add type + interface method)
- Modify: `apps/web/lib/repositories/supabase/course-repository.ts` (impl)

- [ ] **Step 1: Add the input type and interface method to `contracts.ts`**

After the `AssignUserToCourseRecordInput` type (around line 243-248), add:

```ts
export type ReassignCourseStaffRecordInput = {
  courseId: string;
  newProfileId: string;
  actorId: string;
  reason: string | null;
};
```

In the `CourseRepository` interface, directly under the `assignUserToCourse(...)` line (around line 319), add:

```ts
  reassignCourseStaff(input: ReassignCourseStaffRecordInput): Promise<void>;
```

- [ ] **Step 2: Implement it in `course-repository.ts`**

Immediately after the `assignUserToCourse` method (it ends around line 252, before `insertStatusEvent`), add:

```ts
    async reassignCourseStaff(input) {
      const admin = getSupabaseAdminClientOrThrow();
      const { error } = await admin.rpc("reassign_course_staff", {
        p_course_id: input.courseId,
        p_new_profile_id: input.newProfileId,
        p_actor_id: input.actorId,
        p_reason: input.reason,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
```

Note: the RPC raises clean messages (e.g. "Course has no current TA to reassign"), which Supabase returns in `error.message` — surface it verbatim.

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS (no error about a missing `reassignCourseStaff` on `CourseRepository`).

If there are OTHER repository implementations of `CourseRepository` (search `implements CourseRepository` / object literals typed as `CourseRepository`), the typecheck will flag any that now lack `reassignCourseStaff`. Add the same method there. To check first:

Run: `grep -rn "CourseRepository" apps/web/lib/repositories | grep -v contracts`
Expected: confirm only the Supabase impl exists; if a mock/in-memory impl exists, add a stub `async reassignCourseStaff() {}` to it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/repositories/contracts.ts apps/web/lib/repositories/supabase/course-repository.ts
git commit -m "feat(repo): reassignCourseStaff calls reassign_course_staff RPC"
```

---

## Task 3: Service function

**Files:**
- Modify: `apps/web/lib/courses/service.ts` (add `reassignCourseStaff`)

- [ ] **Step 1: Add the service function**

In `apps/web/lib/courses/service.ts`, after `assignUserToCourse` (ends ~line 144), add:

```ts
export type ReassignCourseStaffInput = {
  courseId: string;
  newProfileId: string;
  reason?: string | null;
};

export async function reassignCourseStaff(input: ReassignCourseStaffInput) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles); // ["admin_full", "super_admin"]

  const profile = await getProfileRepository().getProfileById(input.newProfileId);
  if (!profile) {
    throw new Error("Selected TA does not exist.");
  }
  if (profile.role !== "standard_user") {
    throw new Error("Courses can only be reassigned to a TA.");
  }

  await getCourseRepository().reassignCourseStaff({
    courseId: input.courseId,
    newProfileId: input.newProfileId,
    actorId: context.profile.id,
    reason: input.reason ?? null,
  });
}
```

`adminRoles`, `requireProfile`, `requireAnyRole`, `getProfileRepository`, and `getCourseRepository` are already imported at the top of this file — no new imports needed.

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/courses/service.ts
git commit -m "feat(service): reassignCourseStaff with admin + TA-target validation"
```

---

## Task 4: Server actions (single + batch)

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/actions.ts`

- [ ] **Step 1: Import the service function**

At the top of `actions.ts`, extend the existing import from `@/lib/courses/service` (currently `assignUserToCourse, transitionCourseStatus`) to include `reassignCourseStaff`:

```ts
import {
  assignUserToCourse,
  transitionCourseStatus,
  reassignCourseStaff,
} from "@/lib/courses/service";
```

- [ ] **Step 2: Add the single-course action**

After `assignTaToCourseAction` (ends ~line 259), add. It reuses the existing `AssignTaState` shape:

```ts
export async function reassignCourseAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const courseId = String(formData.get("courseId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!courseId || !profileId) {
    return { kind: "error", message: "Select both a course and a new TA." };
  }

  try {
    await reassignCourseStaff({ courseId, newProfileId: profileId, reason });

    revalidatePath("/admin");
    revalidatePath("/ta");
    revalidatePath(`/courses/${courseId}`);

    return { kind: "success", message: "Course reassigned to the new TA." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reassign the course.";
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_assignment");
      scope.setTag("action", "reassign_course");
      scope.setTag("actor_role", context.profile.role);
      scope.setContext("reassign_attempt", {
        actorId: context.profile.id,
        actorEmail: context.profile.email,
        courseId,
        profileId,
      });
      scope.setLevel("error");
      Sentry.captureException(error instanceof Error ? error : new Error(message));
    });
    return { kind: "error", message };
  }
}
```

- [ ] **Step 3: Add the batch action**

Directly after `reassignCourseAction`, add. It mirrors `batchAssignTaAction`'s per-item error handling and `results[]` contract:

```ts
export async function batchReassignCourseAction(
  _state: AssignTaState,
  formData: FormData,
): Promise<AssignTaState> {
  const context = await requireProfile();
  requireAnyRole(context, ["admin_full", "super_admin"]);

  const profileId = String(formData.get("profileId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const courseIds = String(formData.get("courseIds") ?? "").split(",").filter(Boolean);

  if (!profileId || courseIds.length === 0) {
    return { kind: "error", message: "Select both a new TA and at least one course." };
  }

  const results: Array<{ courseId: string; title: string; success: boolean; message: string }> = [];
  let successCount = 0;

  for (const courseId of courseIds) {
    const detail = await getAdminCourseDetail(courseId);
    const title = detail?.course.title ?? "Unknown Course";
    try {
      await reassignCourseStaff({ courseId, newProfileId: profileId, reason });
      results.push({ courseId, title, success: true, message: "Reassigned" });
      successCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Reassignment failed";
      results.push({ courseId, title, success: false, message: msg });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/ta");
  courseIds.forEach((id) => revalidatePath(`/courses/${id}`));

  if (successCount === courseIds.length) {
    return { kind: "success", message: `Reassigned ${successCount} course(s).`, results };
  }
  if (successCount === 0) {
    return { kind: "error", message: "All reassignments failed.", results };
  }
  return {
    kind: "success",
    message: `Reassigned ${successCount} out of ${courseIds.length} courses. Some failed.`,
    results,
  };
}
```

`getAdminCourseDetail`, `requireProfile`, `requireAnyRole`, `revalidatePath`, and `Sentry` are already imported in this file.

- [ ] **Step 4: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/admin/actions.ts"
git commit -m "feat(actions): reassignCourseAction + batchReassignCourseAction"
```

---

## Task 5: Reassign dialog + table entry points

**Files:**
- Create: `apps/web/app/(dashboard)/admin/_components/reassign-dialog.tsx`
- Modify: `apps/web/app/(dashboard)/admin/_components/assigned-courses-table.tsx`

- [ ] **Step 1: Create the reassign dialog component**

Create `apps/web/app/(dashboard)/admin/_components/reassign-dialog.tsx`. It handles both single and multi: the caller passes the selected course rows. It uses `useActionState` against the batch action (single is just one id):

```tsx
"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { ProfileOption } from "@/lib/repositories/contracts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { batchReassignCourseAction, type AssignTaState } from "../actions"

const initialState: AssignTaState = { kind: "idle", message: null }

export type ReassignTarget = { id: string; title: string; currentTaId: string | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courses: ReassignTarget[]
  tas: ProfileOption[]
  onDone?: () => void
}

export function ReassignDialog({ open, onOpenChange, courses, tas, onDone }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(batchReassignCourseAction, initialState)
  const [taId, setTaId] = useState("")
  const [taSearch, setTaSearch] = useState("")
  const lastHandled = useRef<AssignTaState | null>(null)

  const courseIds = useMemo(() => courses.map((c) => c.id).join(","), [courses])
  const normalizedSearch = taSearch.trim().toLowerCase()
  const visibleTas = useMemo(
    () =>
      tas.filter((t) =>
        !normalizedSearch ||
        (t.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
        t.email.toLowerCase().includes(normalizedSearch),
      ),
    [tas, normalizedSearch],
  )

  // Surface result + close on success.
  useEffect(() => {
    if (state === lastHandled.current) return
    if (state.kind === "success") {
      lastHandled.current = state
      toast.success(state.message ?? "Courses reassigned.")
      router.refresh()
      onDone?.()
      onOpenChange(false)
    } else if (state.kind === "error") {
      lastHandled.current = state
      toast.error(state.message ?? "Reassignment failed.")
    }
  }, [state, router, onDone, onOpenChange])

  // Reset selection when reopened.
  useEffect(() => {
    if (open) {
      setTaId("")
      setTaSearch("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign {courses.length === 1 ? "course" : `${courses.length} courses`}</DialogTitle>
          <DialogDescription>
            Move {courses.length === 1 ? "this course" : "these courses"} to a different TA. The
            current TA loses access and the new TA is notified.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="courseIds" value={courseIds} />

          <div className="space-y-2">
            <label className="text-sm font-medium">New TA</label>
            <Input
              placeholder="Search TAs by name or email"
              value={taSearch}
              onChange={(e) => setTaSearch(e.target.value)}
            />
            <Select name="profileId" value={taId} onValueChange={setTaId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a TA" />
              </SelectTrigger>
              <SelectContent>
                {visibleTas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName ?? t.email} ({t.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea name="reason" placeholder="Why is this being reassigned?" rows={3} />
          </div>

          {state.kind === "error" && state.results && (
            <ul className="max-h-32 space-y-1 overflow-auto text-xs">
              {state.results.filter((r) => !r.success).map((r) => (
                <li key={r.courseId} className="text-destructive">
                  {r.title}: {r.message}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !taId || courses.length === 0}>
              {pending ? "Reassigning…" : "Reassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

Note: if `@/components/ui/textarea` does not exist, first add it with `npx shadcn@latest add textarea` (check `apps/web/components/ui/` for `textarea.tsx` before assuming). `dialog`, `select`, `input`, `button` are already present (used elsewhere in the app).

- [ ] **Step 2: Verify the dialog typechecks in isolation**

Run: `pnpm typecheck`
Expected: PASS (the component isn't imported yet, but its own types must resolve).

- [ ] **Step 3: Wire entry points into `assigned-courses-table.tsx`**

This table already has `selectedIds: Set<string>` and a `tas: ProfileOption[]` prop. Add reassign UI.

a) Add imports near the existing `batchApproveToStagingAction` import:

```ts
import { ReassignDialog, type ReassignTarget } from "./reassign-dialog"
```

b) Add dialog state inside the component (near the other `useState` hooks):

```ts
const [reassignTargets, setReassignTargets] = useState<ReassignTarget[]>([])
const [reassignOpen, setReassignOpen] = useState(false)
```

c) Add a helper that maps `AdminCourseRow` → `ReassignTarget` and opens the dialog. Place it with the other handlers (near `handleBatchApprove`):

```ts
const openReassign = (rows: AdminCourseRow[]) => {
  const targets = rows
    .filter((r) => r.ta) // only courses that currently have a TA can be reassigned
    .map((r) => ({ id: r.id, title: r.title, currentTaId: r.ta?.id ?? null }))
  if (targets.length === 0) {
    toast.error("Select at least one course that already has a TA.")
    return
  }
  setReassignTargets(targets)
  setReassignOpen(true)
}

const selectedRows = useMemo(
  () => page.data.filter((c) => selectedIds.has(c.id)),
  [page.data, selectedIds],
)
```

d) Add a bulk button next to the existing batch-approve button (in the bulk action bar that renders when `selectedIds.size > 0`):

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => openReassign(selectedRows)}
  disabled={isBatchPending}
>
  Reassign selected
</Button>
```

e) Add a per-row "Reassign" affordance. In the row's actions cell (where the TA avatar / status renders), for rows where `course.ta` is non-null, add:

```tsx
{course.ta && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => openReassign([course])}
  >
    Reassign
  </Button>
)}
```

f) Render the dialog once, near the end of the component's returned JSX (before the closing wrapper):

```tsx
<ReassignDialog
  open={reassignOpen}
  onOpenChange={setReassignOpen}
  courses={reassignTargets}
  tas={tas}
  onDone={() => setSelectedIds(new Set())}
/>
```

- [ ] **Step 4: Verify typecheck + build**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm --filter web build` (or `pnpm build`)
Expected: PASS — no missing-module or prop-type errors.

- [ ] **Step 5: Manual UI smoke test**

Start the app (`pnpm dev` or the project's run script), log in as an admin, go to `/admin`, find a course that has a TA. Verify:
- The per-row "Reassign" button opens the dialog; a course with no TA shows no button.
- Selecting a new TA + optional reason + Reassign shows a success toast and the table now shows the new TA after refresh.
- Select multiple assigned courses → "Reassign selected" reassigns them all; a mixed/failed item is reported.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(dashboard)/admin/_components/reassign-dialog.tsx" \
        "apps/web/app/(dashboard)/admin/_components/assigned-courses-table.tsx"
git commit -m "feat(admin): reassign dialog + per-row and bulk reassign entry points"
```

---

## Task 6: Notifications (derived + realtime toast)

**Files:**
- Modify: `apps/web/lib/notifications/queries.ts`
- Modify: `apps/web/components/providers/notification-provider.tsx`

- [ ] **Step 1: Add the derived reassignment query + mapping in `queries.ts`**

Add a row type near the other `*Row` types (after `SupportMessageRow`, ~line 76):

```ts
type ReassignmentRow = {
  id: string;
  course_id: string;
  to_profile_id: string;
  created_at: string;
  courses: { title: string | null } | { title: string | null }[] | null;
  to_profile: { full_name: string | null } | { full_name: string | null }[] | null;
};
```

Add a fetch function (place it near `getOpenSupportMessages`):

```ts
async function getRecentReassignments(
  forProfileId: string,
  isAdmin: boolean,
): Promise<ReassignmentRow[]> {
  const admin = getSupabaseAdminClientOrThrow();
  let query = admin
    .from("course_reassignments")
    .select("id, course_id, to_profile_id, created_at, courses ( title ), to_profile:to_profile_id ( full_name )")
    .order("created_at", { ascending: false })
    .limit(50);

  // TAs only see reassignments TO them; admins see all recent.
  if (!isAdmin) {
    query = query.eq("to_profile_id", forProfileId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load reassignments: ${error.message}`);
  }
  return (data ?? []) as unknown as ReassignmentRow[];
}
```

Add the mapper (near the other `*ToNotification` functions):

```ts
function reassignmentToNotification(row: ReassignmentRow, viewerIsAdmin: boolean): NotificationItem {
  const courseTitle = firstRelation(row.courses)?.title ?? null;
  const toName = firstRelation(row.to_profile)?.full_name ?? "a TA";
  return {
    id: `reassign-${row.id}`,
    kind: "assignment",
    tone: viewerIsAdmin ? "default" : "success",
    title: viewerIsAdmin
      ? `Course reassigned to ${toName}`
      : `You've been assigned ${courseTitle ?? "a course"}`,
    description: viewerIsAdmin
      ? `${courseTitle ?? "A course"} was reassigned to ${toName}.`
      : `${courseTitle ?? "A course"} was reassigned to you. Open it when you're ready.`,
    courseTitle,
    meta: "Reassignment",
    href: viewerIsAdmin ? `/admin/courses/${row.course_id}` : `/courses/${row.course_id}/metadata`,
    createdAt: row.created_at,
    pending: !viewerIsAdmin, // actionable for the new TA, informational for admins
  };
}
```

- [ ] **Step 2: Include reassignments in `getNotificationsPageData`**

In `getNotificationsPageData`, extend the `Promise.all` block (currently fetching courses/issues/comments/supportMessages, ~line 121) to also fetch reassignments, and add them to the merged `notifications` array.

Add to the destructured `Promise.all`:

```ts
    const [courses, issues, comments, supportMessages, reassignments] = await Promise.all([
      getRelevantCourses(accessibleCourseIds, role),
      getRelevantIssues(accessibleCourseIds),
      getRecentComments(accessibleCourseIds, context.profile.id),
      role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
      getRecentReassignments(context.profile.id, isAdmin),
    ]);
```

Add to the `notifications` array literal:

```ts
      ...reassignments.map((r) => reassignmentToNotification(r, isAdmin)),
```

(`isAdmin` is already computed at the top of the function; `firstRelation` already exists.)

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Add the realtime toast channel in `notification-provider.tsx`**

The existing `assignmentChannel` listens to `course_assignments` INSERT — but reassignment is an in-place UPDATE, so it won't fire there. Add a dedicated channel on the `course_reassignments` INSERT (the trace row). Place it alongside the other channel declarations (before the `return () => {...}` cleanup):

```tsx
    const reassignmentChannel = supabase
      .channel("public:course_reassignments:insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_reassignments" },
        async (payload) => {
          if (!dedup(`reassign-${payload.new.id}`)) return
          const isNewTa = payload.new.to_profile_id === userId
          // Relevant to the new TA, or to any admin watching.
          if (!isNewTa && !IS_ADMIN(role)) return
          // Don't toast the actor about their own action.
          if (payload.new.reassigned_by === userId) return

          const courseTitle = await getCourseCode(payload.new.course_id)

          if (isNewTa) {
            toast.success("📚 Course Reassigned to You", {
              description: `"${courseTitle}" was reassigned to you. Open it when you are ready.`,
              duration: Infinity,
              action: {
                label: "Open Review",
                onClick: () => router.push(`/courses/${payload.new.course_id}/metadata`),
              },
            })
            playNotificationTone("success")
          } else {
            const toName = await getAuthorName(payload.new.to_profile_id)
            toast.info("🔄 Course Reassigned", {
              description: `"${courseTitle}" was reassigned to ${toName}.`,
              duration: Infinity,
              action: {
                label: "View",
                onClick: () => router.push(`/admin/courses/${payload.new.course_id}`),
              },
            })
            playNotificationTone("info")
          }
          router.refresh()
        }
      )
      .subscribe()
```

Then add to the cleanup `return () => { ... }` block:

```tsx
      supabase.removeChannel(reassignmentChannel)
```

- [ ] **Step 5: Verify typecheck + build**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 6: Manual notification smoke test**

With the app running and the dev DB migrated: open two browsers — one as the admin doing the reassign, one logged in as the target TA. Reassign a course; verify the TA browser shows the "Course Reassigned to You" toast and the course appears on their dashboard, and the TA's `/notifications` page lists the reassignment. Confirm the previous TA gets no toast.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/notifications/queries.ts apps/web/components/providers/notification-provider.tsx
git commit -m "feat(notifications): reassignment notifications for new TA + admins"
```

---

## Self-Review notes

- **Spec coverage:** swap (Task 1 RPC) ✓; transaction safety (single RPC tx) ✓; durable trace with actor + reason (Task 1 table + RPC) ✓; any-status (no status gate anywhere) ✓; admin + super-admin (actions gated to both; super-admin reaches `/admin`) ✓; one + multi (single + batch action, dialog handles both) ✓; notify new TA + admins (Task 6 derived + realtime) ✓; previous TA NOT notified (filtered out) ✓.
- **Type consistency:** `reassignCourseStaff` (repo/service) and `reassign_course_staff` (RPC) names are intentional (TS camelCase vs SQL snake_case); `ReassignCourseStaffRecordInput` (repo) vs `ReassignCourseStaffInput` (service) are distinct types by design; `AssignTaState` reused for both actions; `ReassignTarget` shared between dialog and table.
- **Open verification (do during Task 2 Step 3 / Task 5 Step 1):** confirm there is no second `CourseRepository` impl needing the new method, and confirm `ui/textarea` exists (add via shadcn if not).
```
