# Design: Communication & Notification Bug Fixes

**Date:** 2026-06-15  
**Branch:** ft-flatten-monorepo  
**Status:** Approved

---

## Background

End-to-end audit of instructor/admin/TA communication channels revealed 5 bugs where built
infrastructure was either unhooked, incomplete, or mis-configured. This spec covers fixing all 5
without adding new architecture.

---

## Communication Architecture (as-is)

| Channel | Storage | Visibility |
|---|---|---|
| Issue Tracker | `course_issues` + `course_issue_comments` | TA/admin; instructor can read provision-phase questions |
| Course Discussion | `course_comments` (internal vs instructor_visible) | Role-filtered; instructors see instructor_visible only |
| Email | `instructor_emails` | Instructor invite only (MS Graph → Resend → noop) |
| In-app Notifications | Computed on poll, no table | Per-role, sourced from 5 DB sources |
| Chat | `conversations` + `messages` (SSE) | Direct/real-time |

**Logs:**
- In-memory circular buffer (500 entries) — patches `console.*`, served at `/api/super-admin/system/logs`
- `course_status_events` table — permanent audit trail of status transitions
- `is_system_message=true` comments — auto-inserted on issue create/resolve

---

## Bug 1: Dismiss System Completely Unhooked

**Root cause:** Three disconnected pieces exist independently: `dismissed_notifications` table, API routes (`/dismiss`, `/dismiss-all`), UI components (`HideButton`, `ClearAllButton`). None are connected to the query layer or the page.

**Fix:**

### Query layer — `lib/notifications/queries.ts`

In `getNotificationsPageData()`, after fetching the profile, load the user's dismissed IDs:

```sql
SELECT notification_id FROM dismissed_notifications WHERE user_id = $profileId
```

Store as a `Set<string>`. After building the full `notifications` array, filter:

```ts
.filter(n => !dismissedIds.has(n.id))
```

This uses the existing computed `id` field (e.g., `course-{id}-{status}`, `issue-{id}`, `comment-{id}`) which already matches what the dismiss routes store.

### UI layer — `app/(dashboard)/notifications/page.tsx`

1. Import `HideButton` from `notification-row-client.tsx` and render it in `NotificationRow` next to the "Open" button.
2. Import `ClearAllButton` and add it to the "Pending attention" card header.

No new components. The components already exist.

---

## Bug 2: Admin CourseReviewDetail Missing Issue Log Section

**Root cause:** `course-review-detail.tsx` reads only 3 of 4 workspace sections. `general_notes` (TA issue log) is never read.

**Fix — `app/(dashboard)/admin/courses/[id]/_components/course-review-detail.tsx`:**

1. Read the 4th section:
   ```ts
   const issueLog = byKey["general_notes"]?.response_data as IssueLogResponseData | undefined
   const issueLogStatus = byKey["general_notes"]?.status ?? null
   ```

2. Add a 4th tile to `ReviewProgressSummary` (Issue Log, using `AlertCircle` icon).

3. Update progress counter from `3` to `4`.

4. Add a new `IssueLogCard` collapsible section that renders issues from `issueLog.issues`. Each issue shows: type, location, severity badge, status badge, description, direct link. Status values are workspace types: `open | fixed | escalated | resolved`.

Placed after the Syllabus card.

---

## Bug 3: @Mention Notifications Are Dead Code

**Root cause:** `notifyMentionedUsersAction` in `lib/issues/notifications.ts` only logs to console. `getNotificationsPageData()` never queries `issue_comment_mentions`.

**Fix:**

### `lib/notifications/queries.ts`

Add `getMentionNotifications(profileId: string): Promise<NotificationItem[]>`:

```sql
SELECT m.comment_id, c.issue_id, c.body, i.course_id, i.title, i.phase,
       p.full_name AS author_name, c.created_at
FROM issue_comment_mentions m
JOIN course_issue_comments c ON c.id = m.comment_id
JOIN course_issues i ON i.id = c.issue_id
LEFT JOIN profiles p ON p.id = c.author_id
WHERE m.mentioned_profile_id = $1
ORDER BY c.created_at DESC
LIMIT 25
```

Map each row to `NotificationItem`:
- `id`: `mention-{comment_id}`
- `kind`: `"comment"`
- `tone`: `"default"`
- `title`: `You were mentioned in a comment on "{issue.title}"`
- `description`: truncated comment body (120 chars)
- `href`: role-appropriate issue URL
- `pending`: true (until dismissed — covered by Bug 1 fix)

Include the result in `getNotificationsPageData()` parallel fetch.

### `lib/issues/notifications.ts`

Remove the TODO comment and dead console.log from `notifyMentionedUsersAction`. The function can return early after validating args — the actual notification is now served by the query-time approach above.

---

## Bug 4: Comments Always Pending

**Root cause:** `commentToNotification()` hardcodes `pending: true`. All comments on assigned courses permanently show in "pending attention".

**Fix — `lib/notifications/queries.ts`:**

Add constant:
```ts
const COMMENT_PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
```

Change `commentToNotification()`:
```ts
pending: Date.now() - Date.parse(comment.created_at) < COMMENT_PENDING_WINDOW_MS,
```

Comments older than 7 days become informational (appear in "All notifications" but not "Pending attention"). Comments within 7 days are still pending until dismissed.

---

## Bug 5: Bell Poll Frequency Mismatch

**Root cause:** `notification-bell.tsx` polls every 60s. `NotificationProvider` polls every 15s and calls `router.refresh()` on pending count changes. The bell can be 45s stale after a toast fires.

**Fix — `components/layout/notification-bell.tsx`:**

Change:
```ts
const POLL_INTERVAL = 60_000 // 1 min
```
To:
```ts
const POLL_INTERVAL = 15_000 // 15s — matches NotificationProvider
```

---

## Files Changed

| File | Change |
|---|---|
| `lib/notifications/queries.ts` | Filter dismissed IDs; add `getMentionNotifications()`; 7-day comment pending window |
| `app/(dashboard)/notifications/page.tsx` | Add `HideButton` per row; add `ClearAllButton` in header |
| `app/(dashboard)/admin/courses/[id]/_components/course-review-detail.tsx` | Read `general_notes`; add `IssueLogCard`; update progress to 4/4 |
| `lib/issues/notifications.ts` | Remove dead TODO + console.log from `notifyMentionedUsersAction` |
| `components/layout/notification-bell.tsx` | `POLL_INTERVAL = 15_000` |

---

## Out of Scope

- Replacing the computed-on-poll notification model with a persisted `notifications` table (Approach C).
- Email notifications for mentions or new comments.
- Read receipts / per-user tracking for individual notification items beyond dismiss.
- Chat system changes.
