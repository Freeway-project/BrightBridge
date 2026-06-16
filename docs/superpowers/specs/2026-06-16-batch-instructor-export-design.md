# Batch Instructor Mail-Merge Export

**Date:** 2026-06-16  
**Status:** Approved  
**Branch:** ft-batch-instructor-export  

---

## Overview

Admins need to select multiple `ready_for_instructor` courses, export a single mail-merge CSV containing each instructor's name, email, Moodle URL, Brightspace URL, and a never-expiring magic dashboard link, and transition all selected courses to `sent_to_instructor` in one click. The admin panel shows real-time tracking of which instructors have opened their link and how many times.

---

## Section 1: Database & Invite Service

### Migration

```sql
-- Make expires_at nullable so NULL means "never expires"
ALTER TABLE review_invites ALTER COLUMN expires_at DROP NOT NULL;

-- Track link access for never-expiring links
ALTER TABLE review_invites
  ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN first_accessed_at TIMESTAMPTZ;
```

### Invite service changes (`lib/invites/service.ts`)

- `ReviewInvite.expiresAt` → `string | null`
- `createReviewInvite` gains optional `neverExpires?: boolean`. When true, inserts `NULL` for `expires_at` instead of `Date.now() + 7 days`.
- `redeemReviewInvite` expiry check changes from `expires_at < NOW()` to `expires_at IS NOT NULL AND expires_at < NOW()` — `NULL` rows never expire.
- New function `recordInviteAccess(inviteId)`: increments `access_count`, sets `first_accessed_at = NOW()` only if currently null. Called server-side when instructor lands on their dashboard via magic link.
- Existing 7-day per-course flow is unchanged — it does not pass `neverExpires`, so its behavior is identical.

### Link redemption behavior split

| Link type | `expires_at` | Reusable? | On click |
|---|---|---|---|
| Batch export (new) | `NULL` | Yes — permanent | `recordInviteAccess()` called each time |
| Per-course invite (existing) | `NOW() + 7d` | No — one-time | `markInviteAccepted()` called once |

---

## Section 2: Server Action & Query

### New query (`lib/admin/queries.ts`)

`getReadyForInstructorCourses()` — returns all courses with status `ready_for_instructor`, joining:
- Assigned instructor (`course_assignments` where `role = 'instructor'`) → `instructorName`, `instructorEmail`, `instructorProfileId`
- `course_metadata` review response → extracts `moodle_url` and `brightspace_url` from `response_data` JSONB

Courses without an assigned instructor are excluded. Returns:

```ts
type ReadyForInstructorCourse = {
  courseId: string
  courseTitle: string
  instructorName: string | null
  instructorEmail: string
  instructorProfileId: string
  moodleUrl: string
  brightspaceUrl: string
}
```

### New server action (`app/(dashboard)/admin/actions.ts`)

`batchExportAndSendAction(courseIds: string[])` — guarded by `admin_full | super_admin`.

For each course ID:
1. Look up instructor + URLs from the query above
2. Call `createReviewInvite({ courseId, email, createdBy, neverExpires: true })` to mint a permanent token
3. Call `transitionCourseStatus({ courseId, toStatus: "sent_to_instructor" })`
4. Build one CSV row: `[instructorName, instructorEmail, courseTitle, moodleUrl, brightspaceUrl, magicLink]`

Returns `{ rows: MailMergeRow[], skipped: number }`. Courses that fail (no instructor, transition error) are skipped — the CSV only contains successes. After all courses, revalidates `/admin`, `/communications`, `/instructor`.

### CSV columns

| Column | Source |
|---|---|
| Instructor Name | `profiles.full_name` via `course_assignments` |
| Instructor Email | `profiles.email` |
| Course Title | `courses.title` |
| Moodle URL | `review_responses.response_data->>'moodle_url'` (course_metadata section) |
| Brightspace URL | `review_responses.response_data->>'brightspace_url'` |
| Magic Link | `buildInviteLink(token)` → `${SITE_URL}/auth/invite/${token}` |

---

## Section 3: Real-time Tracking

### Infrastructure

- Install `@supabase/supabase-js`
- Add to `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Enable Realtime on `review_invites` table in Supabase dashboard

### Tracking flow

When an instructor clicks their magic link:
- Server calls `recordInviteAccess(inviteId)` → increments `access_count`, sets `first_accessed_at` on first click
- Supabase broadcasts the `postgres_changes` UPDATE event on `review_invites`

### Admin panel real-time subscription

The `BatchExportPanel` client component subscribes on mount:

```ts
supabase
  .channel('invite-access')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'review_invites',
    filter: `course_id=in.(${exportedCourseIds.join(',')})`
  }, (payload) => updateRowInUI(payload.new))
  .subscribe()
```

The panel table shows a live "Status" column per instructor row:
- **Not yet opened** — `access_count === 0`
- **Opened N× (first: Jun 14)** — `access_count > 0`, formatted from `first_accessed_at`

No page refresh needed. Admin sees instructor engagement update in real time.

---

## Section 4: UI — New "Batch Export" Tab

### Location

New tab added to `AdminTabs` alongside existing Courses / Assign TA / Escalations tabs.  
Tab label: **"Send to Instructors"**. Shows a badge count of `ready_for_instructor` courses.

### Panel component (`_components/batch-export-panel.tsx`)

**Before export (selection state):**
- Table listing all `ready_for_instructor` courses: checkboxes | Course Title | Instructor Name | Instructor Email | Moodle URL | Brightspace URL
- Courses missing an instructor shown with a warning indicator (excluded from export)
- "Select all" header checkbox
- Sticky footer toolbar (visible when ≥1 selected): "N courses selected · Export CSV & Send to Instructor" button

**On export:**
- Button triggers `batchExportAndSendAction(selectedIds)`
- On success: CSV downloads client-side, courses disappear from the selection table (they're now `sent_to_instructor`), a toast shows "Exported N, skipped M (no instructor assigned)"

**After export (tracking state):**
- A separate "Sent" table below (or same tab, refreshed) shows recently exported courses with the live "opened" status column fed by Supabase Realtime
- Admin can re-export a fresh CSV for any row using an inline "Re-export" button (calls `resendInstructorInviteAction` — existing function, already revokes old never-expiring link and mints a new one)

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/<ts>_batch_export.sql` | ALTER TABLE for nullable expires_at + access_count columns |
| `lib/invites/service.ts` | neverExpires flag, recordInviteAccess, expiry check fix |
| `lib/admin/queries.ts` | getReadyForInstructorCourses query |
| `app/(dashboard)/admin/actions.ts` | batchExportAndSendAction |
| `app/(dashboard)/admin/_components/batch-export-panel.tsx` | New panel UI |
| `app/(dashboard)/admin/_components/admin-tabs.tsx` | New tab wiring |
| `app/(dashboard)/admin/page.tsx` | Pass ready-for-instructor data to new tab |
| `lib/supabase/client.ts` | Supabase browser client (new) |
| `apps/web/.env.example` | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| `apps/web/package.json` | Add @supabase/supabase-js |

---

## Out of Scope

- Sending emails directly from the app (mail merge remains manual)
- Per-course export UI changes (existing flow untouched)
- Revoking never-expiring links from the UI (admin can do this directly in Supabase dashboard for now)
