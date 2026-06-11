# Course Reassignment (Admin & Super Admin) — Design

**Date:** 2026-06-05
**Status:** Approved for planning
**Branch:** feat/org-chart-improvements (or a dedicated feat branch)

## Problem

Admins and super admins need to reassign a course — or several courses at once —
from its current TA to a different TA. The change must be:

- **Transaction-safe** — never leave a course in a half-reassigned state (e.g. old
  TA removed but new TA not yet assigned → course with no reviewer).
- **Fully traced** — a durable, queryable record of *who* reassigned *which* course
  *from whom*, *to whom*, *when*, and *why*.
- **Notified** — the new TA and admins are told about the change.

### Why the existing paths don't cover this

- `assignUserToCourse` (`lib/courses/service.ts:112`) **blocks** reassignment: it
  throws `"This course is already assigned to a TA"` when a different TA already
  holds the staff slot (`service.ts:133`). Reassignment is therefore a distinct
  operation, not a reuse of the assign path.
- The generic `audit_log` trigger (`audit_capture`,
  `supabase/migrations/20260603120000_audit_log.sql`) records actor via
  `auth.uid()`. Admin server actions write through the **service-role client**,
  which carries no user JWT, so `auth.uid()` is `NULL`. The real actor survives
  only indirectly via the `course_assignments.assigned_by` column inside
  `new_data`. That is not a reliable, reason-carrying trace.
- Notifications are **derived on read** (`lib/notifications/queries.ts`), not
  stored. With no explicit source row, a reassigned TA would only passively see the
  course appear in their list — no active notification.

## Decisions (confirmed)

| Question | Decision |
| --- | --- |
| Current TA on reassign | **Replace (swap)** — one staff per course |
| Notify whom | **New TA** + **Admins** (not previous TA, not instructor) |
| Reason note | **Optional** — stored with the trace record |
| Status gate | **Any status** — reassignment is independent of the workflow state machine |
| Trace mechanism | **Dedicated `course_reassignments` table** (plus the existing audit trigger on top) |
| Atomicity | **Single Postgres RPC** wrapping swap + log in one transaction |

## Architecture

### 1. Database migration

New migration adding:

**`public.course_reassignments`** — the durable trace + notification source:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | `gen_random_uuid()` |
| `course_id` | uuid | FK → `courses(id)` on delete cascade |
| `from_profile_id` | uuid | FK → `profiles(id)` — previous TA |
| `to_profile_id` | uuid | FK → `profiles(id)` — new TA |
| `reassigned_by` | uuid | FK → `profiles(id)` — the admin/super-admin actor |
| `reason` | text | nullable; trimmed, empty → NULL |
| `created_at` | timestamptz | default `now()` |

Indexes: `(to_profile_id, created_at desc)` for the new-TA notification query,
`(course_id, created_at desc)` for per-course history.

RLS: enable; admin read policy (`is_admin_role()`); a TA may read rows where
`to_profile_id = auth.uid()`. No client INSERT policy — only the SECURITY DEFINER
RPC writes.

**`public.reassign_course_staff(p_course_id, p_new_profile_id, p_actor_id, p_reason)`**
— `SECURITY DEFINER`, `set search_path = public`:

1. `SELECT profile_id INTO v_old FROM course_assignments
    WHERE course_id = p_course_id AND role = 'staff' FOR UPDATE;`
   (row lock prevents a concurrent reassign race)
2. Raise `'Course has no current TA to reassign'` if `v_old IS NULL`.
3. Raise `'Course is already assigned to this TA'` if `v_old = p_new_profile_id`.
4. `UPDATE course_assignments SET profile_id = p_new_profile_id,
    assigned_by = p_actor_id, assigned_at = now()
    WHERE course_id = p_course_id AND role = 'staff';`
   — in-place swap: atomic, preserves the one-staff-per-course partial index, and
   the `audit_log` UPDATE trigger fires with old/new `profile_id`.
5. `INSERT INTO course_reassignments (course_id, from_profile_id, to_profile_id,
    reassigned_by, reason) VALUES (..., nullif(btrim(p_reason), ''));`

Both writes run in the function's single transaction → all-or-nothing. `EXECUTE`
granted to `service_role` only (app-layer `requireAnyRole` is the authorization
gate; the RPC is never called directly by clients).

Add `course_reassignments` to the `supabase_realtime` publication.

### 2. Service layer — `lib/courses/service.ts`

```ts
export async function reassignCourseStaff(input: {
  courseId: string;
  newProfileId: string;
  reason?: string | null;
}) {
  const context = await requireProfile();
  requireAnyRole(context, adminRoles); // ["admin_full", "super_admin"]

  const profile = await getProfileRepository().getProfileById(input.newProfileId);
  if (!profile) throw new Error("Selected TA does not exist.");
  if (profile.role !== "standard_user") {
    throw new Error("Courses can only be reassigned to a TA (standard user).");
  }

  await getCourseRepository().reassignCourseStaff({
    courseId: input.courseId,
    newProfileId: input.newProfileId,
    actorId: context.profile.id,
    reason: input.reason ?? null,
  });
}
```

The repository method calls the RPC via the admin client:
`admin.rpc("reassign_course_staff", { p_course_id, p_new_profile_id, p_actor_id, p_reason })`
and throws on `error`.

### 3. Server actions — `apps/web/app/(dashboard)/admin/actions.ts`

- `reassignCourseAction(_state, formData)` — single course. Reads `courseId`,
  `profileId`, `reason`. `requireAnyRole(["admin_full","super_admin"])`. Calls
  `reassignCourseStaff`. `revalidatePath("/admin")`, `"/ta"`, `/courses/${id}`.
  Sentry-scoped error logging mirroring `assignTaToCourseAction`.
- `batchReassignCourseAction(_state, formData)` — multi course. Reads `courseIds`
  (comma-split), `profileId`, `reason`. Loops per course with per-item try/catch,
  returns a `results[]` array (`{ courseId, title, success, message }`) exactly
  like `batchAssignTaAction`. Partial success reported. Each course is its own RPC
  transaction; there is intentionally no cross-course transaction (per-course
  atomicity + partial-success reporting is the desired behavior).

Reuse the existing `AssignTaState` shape.

### 4. UI — `apps/web/app/(dashboard)/admin/_components/assigned-courses-table.tsx`

The table already supports bulk-select. Add:

- A per-row **"Reassign"** action.
- A bulk **"Reassign selected"** button (parallel to the existing batch-approve),
  enabled when ≥1 *assigned* course is selected (reassign requires a current TA).
- A **reassign dialog**: TA picker (reuse the staff-list pattern from
  `admin-assignment-panel.tsx`) + optional **reason** textarea + submit. Shows
  per-course results on completion.

Exposed for `admin_full` and `super_admin`. (Super-admin entry point: confirm
during planning whether super admins reach `/admin`; if they have a separate course
surface, surface the same action there.)

### 5. Notifications

**Persisted/derived (primary):** extend `getNotificationsPageData`
(`lib/notifications/queries.ts`) with a `getRecentReassignments` query returning
`course_reassignments` rows where `to_profile_id = me` (new TA) or, for admins, all
recent rows. Map to `NotificationItem` with `kind: "assignment"`:
- New TA: "You've been assigned **{course}**" — pending.
- Admin: "**{course}** reassigned to {new TA name}" — informational.

**Realtime toast (secondary):** the existing `notification-provider.tsx`
subscribes to `course_reassignments` (now on the realtime publication). Client-side
filter: toast when `to_profile_id === myId` (new TA) or when my role ∈ admin roles.
Reuses the in-app/Sonner toast pattern already used for `course_status_events`.

This matches the project's "in-app first, push later" notification principle.

## Out of scope (YAGNI)

- Email notifications on reassignment.
- Notifying the previous TA or the instructor.
- Adding a co-TA / multi-TA model (the staff slot stays single).
- A standalone reassignment-history page (the trace lives in `course_reassignments`
  and surfaces via the notifications feed + audit log; a dedicated UI can come
  later if needed).
- Reassignment via the workflow state machine (status is unchanged by design).

## Testing

- **RPC** (SQL / integration): swap updates the staff row in place; old TA loses
  access, new TA gains it; a `course_reassignments` row is written with the actor
  and reason; raises on no-current-TA and on same-TA; `FOR UPDATE` serializes
  concurrent reassigns.
- **Service**: rejects non-admin callers; rejects a non-`standard_user` target;
  passes the authenticated actor as `reassigned_by`.
- **Batch action**: partial success returns per-course results; one failure does
  not abort the rest.
- **Notifications**: a reassignment produces a notification item for the new TA and
  for admins, and not for the previous TA.

## Key files

| Concern | Path |
| --- | --- |
| Assignment schema / one-staff index | `supabase/migrations/20260428121500_initial_schema.sql:71` |
| Audit trigger (null-actor caveat) | `supabase/migrations/20260603120000_audit_log.sql:56` |
| Blocking assign logic | `apps/web/lib/courses/service.ts:112` |
| Existing batch assign action | `apps/web/app/(dashboard)/admin/actions.ts:68` |
| Notifications (derived) | `apps/web/lib/notifications/queries.ts:106` |
| Realtime toast provider | `apps/web/app/(dashboard)/components/providers/notification-provider.tsx` |
| Bulk-select table | `apps/web/app/(dashboard)/admin/_components/assigned-courses-table.tsx` |
| TA picker pattern | `apps/web/app/(dashboard)/admin/_components/admin-assignment-panel.tsx` |
