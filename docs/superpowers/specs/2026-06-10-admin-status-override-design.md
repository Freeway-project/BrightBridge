# Admin Status Override + Notification Dismissal — Design

**Date:** 2026-06-10
**Branch:** `feat/admin-status-override`
**Target:** `main`

## Problem

Today only `super_admin` can move a course between arbitrary statuses. `admin_full` is constrained to the hand-picked transitions in `packages/workflow/src/transitions.ts`, which means real operational situations ("put this course back to TA Review from Final Approved") require either a super-admin or a DB edit. We also have no way to tell, from the audit trail, that a status change was a deliberate override rather than a normal workflow step.

Separately, the existing `/notifications` page has no way for a user to dismiss a single notification or clear them all at once.

## Goals

1. `admin_full` can move any course from any of the 13 statuses to any other, with required confirmation + reason.
2. Overrides are distinguishable from normal transitions in the audit trail.
3. The assigned TA on the course gets an in-app notification when an override happens.
4. Users can hide a single notification or clear all notifications from the `/notifications` page.

## Non-Goals (YAGNI)

- Email or browser-push delivery channel
- Notification preferences/settings page
- Bulk status override across multiple courses
- Notifying anyone other than the assigned TA (instructor, super-admin, comms — separate features if needed)
- Un-dismissing notifications

## Architecture

### Layer 1 — Workflow package
Add `isAdminOverride(role, from, to): boolean` to `packages/workflow/src/transitions.ts`. Returns true when:
- `role` is `admin_full` or `super_admin`
- `from !== to`

The canonical `COURSE_TRANSITIONS` list is **not** extended. Override is a parallel authorization path used only by a dedicated server action; the workflow's normal transition rules stay legible.

### Layer 2 — Database

**Migration A: `course_status_event_kind.sql`**

```sql
alter table public.course_status_events
  add column kind text not null default 'transition'
  check (kind in ('transition','admin_override'));

alter table public.course_status_events
  add constraint course_status_events_override_requires_note
  check (kind = 'transition' or (note is not null and length(trim(note)) >= 10));
```

The existing `courses` UPDATE trigger continues to write to `audit_log` for free — no extra audit work.

**Migration B: `dismissed_notifications.sql`**

```sql
create table public.dismissed_notifications (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  notification_id text not null,
  dismissed_at   timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.dismissed_notifications enable row level security;

create policy dismissed_notifications_own_read on public.dismissed_notifications
  for select using (user_id = auth.uid());

create policy dismissed_notifications_own_insert on public.dismissed_notifications
  for insert with check (user_id = auth.uid());
```

`notification_id` is the synthetic id `getNotificationsPageData()` already builds (e.g. `issue:<uuid>`, `override:<event_id>`).

### Layer 3 — Server actions / API routes

**`overrideCourseStatus({ courseId, to, reason })`** in `apps/web/app/(dashboard)/admin/courses/[id]/actions.ts`:
- Authz: throws `Forbidden` unless caller's role is `admin_full` or `super_admin` (via `requireProfile()`).
- Validates `reason.trim().length >= 10`.
- Reads current status; rejects if `to === current`.
- Single transaction:
  - `insert into course_status_events (course_id, from_status, to_status, actor_id, actor_role, note, kind) values (..., 'admin_override')`
  - `update courses set status = $to where id = $courseId`
- Revalidates the course detail path.

**`POST /api/notifications/dismiss`** `{ id: string }` → inserts one row into `dismissed_notifications`.

**`POST /api/notifications/dismiss-all`** → reads current `getNotificationsPageData()` for caller, inserts a dismissal row for every pending id (upsert/on-conflict-do-nothing).

### Layer 4 — Notification derivation

Extend `getNotificationsPageData()` in `apps/web/lib/notifications/queries.ts`:

1. **New source — admin override → assigned TA:**
   - Query `course_status_events` rows where `kind = 'admin_override'` AND `created_at > now() - interval '14 days'`.
   - Join `course_assignments` to filter rows where the assigned TA = current user.
   - Synthesize `NotificationItem`:
     - `id = "override:" + event.id`
     - `kind = "course_action"`, `tone = "warning"`
     - `title = "Status changed by admin"`
     - `description = "${actor_name} moved this course from ${from_label} to ${to_label}. Reason: ${note}"`
     - `href = "/courses/${course_id}"`
     - `pending = true` (until dismissed)
2. **Filter dismissals:** before returning, filter out any item whose `id` is in the caller's `dismissed_notifications`.

### Layer 5 — UI

**Status override dialog**
New component `apps/web/app/(dashboard)/admin/courses/[id]/_components/status-override-dialog.tsx`:
- Trigger button **"Change status…"** added to `admin-course-sidebar.tsx` (visible only to `admin_full` / `super_admin`).
- Modal contents:
  - Header: *"Move '{course.title}' from **{current label}** to **{target label}**?"* (target label updates as dropdown changes)
  - Dropdown listing all 13 statuses — current status disabled
  - Reason textarea, required, `minLength={10}`, helper text "Recorded in the audit trail"
  - Confirm / Cancel buttons; Confirm disabled until target chosen + reason ≥10 chars
- On confirm: calls `overrideCourseStatus`, closes modal, shows toast, router refresh.

**Timeline rendering**
Wherever `course_status_events` rows are listed (course detail timeline + super-admin audit view — exact files TBD during implementation), rows with `kind='admin_override'` render with:
- Orange "Admin override" badge
- The reason text shown inline beneath the from→to line

**Notifications page (`apps/web/app/notifications/page.tsx`)**
- Each notification card gets a small "×" icon button (aria-label `"Hide"`) in the top-right that calls `/api/notifications/dismiss` and optimistically removes the row.
- Toolbar at top of list: **"Clear all"** button. Confirms with `window.confirm`, calls `/api/notifications/dismiss-all`, optimistically clears the list.
- Both actions update the bell count on next 60s poll (or sooner via router refresh).

## Data flow — admin override

1. Admin opens course detail → sidebar shows "Change status…" button
2. Click → modal opens, admin picks target status + types reason
3. Confirm → `overrideCourseStatus` server action
4. DB: row inserted into `course_status_events` (kind=admin_override), `courses.status` updated
5. The `courses` UPDATE trigger writes an `audit_log` row automatically (no code)
6. On next `/api/notifications/count` poll for the assigned TA, the new override appears as a notification
7. Timeline on the course detail page shows the new event with the orange override badge

## Error handling

- Server action throws on non-admin role, invalid `to`, empty reason → caught in dialog, shown as inline error
- Dismiss API returns 401 if not authed, 400 if id missing — toast shown, row stays visible
- DB constraint `override_requires_note` is the last line of defence; should never fire if server-side validation works

## Testing

- **Unit (`packages/workflow`)**: `isAdminOverride` truth table — admin_full/super_admin pass, others fail; same status returns false.
- **Server action**: rejects non-admin caller; rejects empty/short reason; writes correct `kind`; updates `courses.status`.
- **Notification derivation**: override row produces a notification for the assigned TA only; dismissed ids are filtered out.
- **Manual (run the app)**: end-to-end — admin overrides a course from `final_approved` back to `ta_review_in_progress`, TA sees notification, dismisses it, count drops, "Clear all" empties remaining notifications.

## Files

**New**
- `supabase/migrations/<ts>_course_status_event_kind.sql`
- `supabase/migrations/<ts>_dismissed_notifications.sql`
- `apps/web/app/(dashboard)/admin/courses/[id]/_components/status-override-dialog.tsx`
- `apps/web/app/api/notifications/dismiss/route.ts`
- `apps/web/app/api/notifications/dismiss-all/route.ts`

**Modified**
- `packages/workflow/src/transitions.ts` — add `isAdminOverride` + export
- `apps/web/app/(dashboard)/admin/courses/[id]/actions.ts` — add `overrideCourseStatus`
- `apps/web/app/(dashboard)/admin/courses/[id]/_components/admin-course-sidebar.tsx` — add button
- `apps/web/lib/notifications/queries.ts` — new override source + filter dismissals
- `apps/web/app/notifications/page.tsx` — Hide + Clear-all UI
- Timeline renderer file(s) — confirmed during implementation — override badge + reason
- Tests as listed above

## Open questions

None blocking. The exact timeline renderer files are discovered during implementation since `course_status_events` is rendered in multiple places.
