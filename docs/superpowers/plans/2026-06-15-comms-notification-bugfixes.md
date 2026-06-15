# Comms & Notification Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 bugs in the instructor/admin/TA communication and notification system: bell frequency mismatch, dead @mention code, comments permanently pending, dismiss system completely unhooked, admin review missing issue log, and TA name not displayed in review views.

**Architecture:** All changes stay within the existing polling-based notification model — no new tables, no new API routes, no new providers. `lib/notifications/queries.ts` handles 4 of the 6 bugs. Two review-detail components get TA name and (admin only) an issue log card. The dismiss and mention work hooks up infrastructure that was already built but never wired.

**Tech Stack:** Next.js 14 App Router, TypeScript, PostgreSQL (raw `pg` pool queries), React Server Components + Client Components, Tailwind CSS, shadcn/ui, lucide-react

---

## File Map

| File | Responsibility after this plan |
|---|---|
| `apps/web/components/layout/notification-bell.tsx` | Poll every 15s (was 60s) |
| `apps/web/lib/issues/notifications.ts` | `notifyMentionedUsersAction` — no-op, no dead code |
| `apps/web/lib/notifications/queries.ts` | Comment pending window; dismiss filter; @mention query |
| `apps/web/app/(dashboard)/notifications/page.tsx` | Per-row dismiss button + clear-all in header |
| `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-review-detail.tsx` | "Reviewed by" row in Course details section |
| `apps/web/app/(dashboard)/admin/courses/[id]/_components/course-review-detail.tsx` | TA name in MetadataCard; IssueLogCard (4th section); progress 3→4 |

---

### Task 1: Fix Bell Poll Frequency (60s → 15s)

**Files:**
- Modify: `apps/web/components/layout/notification-bell.tsx:8`

- [ ] **Step 1: Change the poll interval constant**

Open `apps/web/components/layout/notification-bell.tsx`. Line 8 currently reads:

```ts
const POLL_INTERVAL = 60_000 // 1 min
```

Change it to:

```ts
const POLL_INTERVAL = 15_000 // 15s — matches NotificationProvider
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/layout/notification-bell.tsx
git commit -m "fix: sync notification bell poll to 15s to match NotificationProvider"
```

---

### Task 2: Remove Dead @Mention Notification Code

**Files:**
- Modify: `apps/web/lib/issues/notifications.ts`

`notifyMentionedUsersAction` fetches issue data then does nothing useful (logs a TODO comment). @Mention notifications are surfaced via the query added in Task 5. Replace the function body with a clean no-op.

- [ ] **Step 1: Replace the function body**

In `apps/web/lib/issues/notifications.ts`, replace the entire `notifyMentionedUsersAction` function (currently lines 5–47, the section that fetches the issue then does a console.log) with:

```ts
export async function notifyMentionedUsersAction(
  _issueId: string,
  _commentId: string,
  _mentionedProfileIds: string[],
  _mentionerName: string
): Promise<void> {
  // Mention notifications are surfaced at query time in
  // lib/notifications/queries.ts (getMentionNotifications).
}
```

Leave `getUnreadMentionsAction` and `getMentionsForUserAction` unchanged — they are separate utilities.

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/issues/notifications.ts
git commit -m "fix: remove dead TODO from notifyMentionedUsersAction"
```

---

### Task 3: Fix Comment Pending — 7-Day Window

**Files:**
- Modify: `apps/web/lib/notifications/queries.ts`

`commentToNotification()` hardcodes `pending: true`, so every comment on every assigned course permanently appears in "Pending attention". Fix: a comment is only pending if it was created within the last 7 days.

- [ ] **Step 1: Add the pending window constant**

In `apps/web/lib/notifications/queries.ts`, after the import block (around line 8, before any type declarations), add:

```ts
/** Comments older than this window are informational, not "pending attention". */
const COMMENT_PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
```

- [ ] **Step 2: Update `commentToNotification` to use the window**

Find `commentToNotification` in the same file (around line 450). It currently returns an object ending with:

```ts
pending: true,
```

Change that line to:

```ts
pending: Date.now() - Date.parse(comment.created_at) < COMMENT_PENDING_WINDOW_MS,
```

The complete updated return object:

```ts
return {
  id: `comment-${comment.id}`,
  kind: "comment",
  tone: "default",
  title: `New comment on ${issue?.title ?? "an issue"}`,
  description: preview,
  courseTitle,
  meta: `By ${authorName}`,
  href: getIssueHref(issue?.course_id ?? "", role),
  createdAt: comment.created_at,
  pending: Date.now() - Date.parse(comment.created_at) < COMMENT_PENDING_WINDOW_MS,
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/notifications/queries.ts
git commit -m "fix: comments older than 7 days are no longer pending in notifications"
```

---

### Task 4: Hook Up Dismiss Filter in getNotificationsPageData

**Files:**
- Modify: `apps/web/lib/notifications/queries.ts`

The `dismissed_notifications` table exists and the API routes (`/api/notifications/dismiss`, `/api/notifications/dismiss-all`) write to it, but `getNotificationsPageData` never reads from it — so dismissing has no effect. Fix: load dismissed IDs and filter the final list.

- [ ] **Step 1: Add `getDismissedIds` helper**

Near the bottom of `apps/web/lib/notifications/queries.ts`, alongside the other private helpers (`getRecentReassignments`, `getOpenSupportMessages`, etc.), add:

```ts
async function getDismissedIds(userId: string): Promise<Set<string>> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ notification_id: string }>(
    `SELECT notification_id FROM dismissed_notifications WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.notification_id));
}
```

- [ ] **Step 2: Add `dismissedIds` to the parallel fetch inside `getNotificationsPageData`**

In `getNotificationsPageData()`, the parallel fetch currently reads:

```ts
const [courses, issues, comments, supportMessages, reassignments] = await Promise.all([
  getRelevantCourses(accessibleCourseIds, role),
  getRelevantIssues(accessibleCourseIds),
  getRecentComments(accessibleCourseIds, context.profile.id),
  role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
  getRecentReassignments(context.profile.id, isAdmin),
]);
```

Replace with (adds `dismissedIds` as the 6th item):

```ts
const [courses, issues, comments, supportMessages, reassignments, dismissedIds] = await Promise.all([
  getRelevantCourses(accessibleCourseIds, role),
  getRelevantIssues(accessibleCourseIds),
  getRecentComments(accessibleCourseIds, context.profile.id),
  role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
  getRecentReassignments(context.profile.id, isAdmin),
  getDismissedIds(context.profile.id),
]);
```

- [ ] **Step 3: Filter notifications by dismissed IDs**

After the `notifications` array is built and sorted, chain a `.filter()` call:

```ts
const notifications = [
  ...courses.map((course) => courseToNotification(course, role)),
  ...issues.map((issue) => issueToNotification(issue, role)),
  ...comments.map((comment) => commentToNotification(comment, role)),
  ...supportMessages.map(supportMessageToNotification),
  ...reassignments.map((r) => reassignmentToNotification(r, isAdmin)),
].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  .filter((n) => !dismissedIds.has(n.id));
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/notifications/queries.ts
git commit -m "fix: filter dismissed notifications out of getNotificationsPageData"
```

---

### Task 5: Add @Mention Notifications Query

**Files:**
- Modify: `apps/web/lib/notifications/queries.ts`

Mentions are stored in `issue_comment_mentions` but never surfaced in the notification feed. Add a query and include the results alongside the existing sources. This task depends on Task 3 (`COMMENT_PENDING_WINDOW_MS`) and Task 4 (`dismissedIds` in the parallel fetch).

- [ ] **Step 1: Add `getMentionNotifications` helper**

Near the bottom of `apps/web/lib/notifications/queries.ts`, after `getDismissedIds`, add:

```ts
async function getMentionNotifications(
  profileId: string,
  role: Role,
): Promise<NotificationItem[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    comment_id: string;
    issue_id: string;
    body: string;
    course_id: string;
    issue_title: string | null;
    author_name: string | null;
    created_at: string;
  }>(
    `
      SELECT
        m.comment_id,
        c.issue_id,
        c.body,
        i.course_id,
        i.title AS issue_title,
        p.full_name AS author_name,
        c.created_at
      FROM issue_comment_mentions m
      JOIN course_issue_comments c ON c.id = m.comment_id
      JOIN course_issues i        ON i.id = c.issue_id
      LEFT JOIN profiles p        ON p.id = c.author_id
      WHERE m.mentioned_profile_id = $1
        AND c.is_system_message = false
      ORDER BY c.created_at DESC
      LIMIT 25
    `,
    [profileId],
  );

  return rows.map((row) => {
    const preview = row.body.length > 120 ? `${row.body.slice(0, 120)}...` : row.body;
    const authorName = row.author_name ?? "Team Member";
    return {
      id: `mention-${row.comment_id}`,
      kind: "comment" as const,
      tone: "default" as const,
      title: `You were mentioned in a comment on "${row.issue_title ?? "an issue"}"`,
      description: preview,
      courseTitle: null,
      meta: `By ${authorName}`,
      href: getIssueHref(row.course_id, role),
      createdAt: row.created_at,
      pending: Date.now() - Date.parse(row.created_at) < COMMENT_PENDING_WINDOW_MS,
    };
  });
}
```

- [ ] **Step 2: Add `mentions` to the parallel fetch**

In `getNotificationsPageData()`, extend the 6-item parallel fetch (from Task 4) to 7 items by adding `getMentionNotifications`:

```ts
const [courses, issues, comments, supportMessages, reassignments, dismissedIds, mentions] = await Promise.all([
  getRelevantCourses(accessibleCourseIds, role),
  getRelevantIssues(accessibleCourseIds),
  getRecentComments(accessibleCourseIds, context.profile.id),
  role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
  getRecentReassignments(context.profile.id, isAdmin),
  getDismissedIds(context.profile.id),
  getMentionNotifications(context.profile.id, role),
]);
```

- [ ] **Step 3: Spread mentions into the notifications array**

Update the `notifications` build to include `...mentions`:

```ts
const notifications = [
  ...courses.map((course) => courseToNotification(course, role)),
  ...issues.map((issue) => issueToNotification(issue, role)),
  ...comments.map((comment) => commentToNotification(comment, role)),
  ...supportMessages.map(supportMessageToNotification),
  ...reassignments.map((r) => reassignmentToNotification(r, isAdmin)),
  ...mentions,
].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  .filter((n) => !dismissedIds.has(n.id));
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/notifications/queries.ts
git commit -m "feat: surface @mention notifications in the polling feed"
```

---

### Task 6: Wire Dismiss UI in Notifications Page

**Files:**
- Modify: `apps/web/app/(dashboard)/notifications/page.tsx`

`HideButton` (per-row dismiss) and `ClearAllButton` already exist as components but are never imported or rendered in the notifications page. Wire them up.

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/(dashboard)/notifications/page.tsx`, add these two imports alongside the existing ones:

```ts
import { HideButton } from "./_components/notification-row-client";
import { ClearAllButton } from "./_components/clear-all-button";
```

- [ ] **Step 2: Add `HideButton` to `NotificationRow`**

Find the `NotificationRow` function. Its bottom-right column currently reads:

```tsx
<div className="flex items-center sm:justify-end">
  <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
    <Link href={item.href}>
      <ExternalLink className="size-3.5" />
      Open
    </Link>
  </Button>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-2 sm:justify-end">
  <HideButton notificationId={item.id} />
  <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
    <Link href={item.href}>
      <ExternalLink className="size-3.5" />
      Open
    </Link>
  </Button>
</div>
```

- [ ] **Step 3: Add `ClearAllButton` to the "Pending attention" card header**

Find the `CardTitle` inside the first `Card` (the "Pending attention" card). It currently reads:

```tsx
<CardTitle className="flex items-center justify-between gap-3 text-sm">
  <span className="inline-flex items-center gap-2">
    <BellRing className="size-4 text-yellow-400" />
    Pending attention
  </span>
  <Badge className="border-yellow-400/30 bg-yellow-500/15 text-yellow-200">{pending.length}</Badge>
</CardTitle>
```

Replace with:

```tsx
<CardTitle className="flex items-center justify-between gap-3 text-sm">
  <span className="inline-flex items-center gap-2">
    <BellRing className="size-4 text-yellow-400" />
    Pending attention
  </span>
  <div className="flex items-center gap-2">
    <ClearAllButton disabled={pending.length === 0} />
    <Badge className="border-yellow-400/30 bg-yellow-500/15 text-yellow-200">{pending.length}</Badge>
  </div>
</CardTitle>
```

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(dashboard)/notifications/page.tsx"
git commit -m "feat: wire dismiss buttons and clear-all into notifications page"
```

---

### Task 7: Show TA Name in Instructor Review Detail

**Files:**
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-review-detail.tsx`

`course.ta` (`{ id, name, email } | null`) is already present on the `course` prop (type `AdminCourseRow`) but the component ignores it. Add a "Reviewed by" row in the Course details section.

- [ ] **Step 1: Use `course` in the function body**

Open `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-review-detail.tsx`.

The function signature is:

```ts
export function InstructorReviewDetail({ responses, sectionKeyById }: Props) {
```

Change to:

```ts
export function InstructorReviewDetail({ course, responses, sectionKeyById }: Props) {
```

- [ ] **Step 2: Derive `taName` after the `byKey` map**

Right after the block that builds `byKey` (the `for` loop), add:

```ts
const taName = course.ta?.name ?? course.ta?.email ?? null;
```

- [ ] **Step 3: Render "Reviewed by" in the Course details section**

Find the `metadata ? (...)` block. Inside the `<dl>`, after the `migration_notes` conditional block, add:

```tsx
{taName && (
  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6">
    <dt className="text-muted-foreground">Reviewed by</dt>
    <dd className="sm:col-span-2 font-medium">{taName}</dd>
  </div>
)}
```

- [ ] **Step 4: Handle the case where metadata is absent**

If `metadata` is null the Course details section is skipped entirely. In that case, show the TA name as a standalone fallback at the very top of the returned JSX (before the issues section check):

```tsx
{!metadata && taName && (
  <p className="text-sm text-muted-foreground">
    Reviewed by <span className="font-medium text-foreground">{taName}</span>
  </p>
)}
```

Add this line immediately before the `{issues.length > 0 && (...)}` block.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-review-detail.tsx"
git commit -m "feat: show reviewer (TA) name in instructor review detail"
```

---

### Task 8: TA Name + Issue Log in Admin Review Detail

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/courses/[id]/_components/course-review-detail.tsx`

Two additions to this file: (a) TA name in the Metadata card, (b) a new IssueLogCard as the 4th collapsible section, and (c) the progress summary updated from 3 → 4 sections.

- [ ] **Step 1: Add `IssueLogResponseData` to the workspace types import**

In `course-review-detail.tsx`, find the existing import from `@/lib/workspace/types`:

```ts
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  SyllabusGradebookResponseData,
} from "@/lib/workspace/types"
```

Add `IssueLogResponseData`:

```ts
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  SyllabusGradebookResponseData,
  IssueLogResponseData,
} from "@/lib/workspace/types"
```

- [ ] **Step 2: Read `general_notes` and TA name in `CourseReviewDetail`**

In the `CourseReviewDetail` function body, after the existing `byKey` population loop and the three existing `const meta / matrix / syllabus` lines, add:

```ts
const issueLog = byKey["general_notes"]?.response_data as IssueLogResponseData | undefined
const issueLogStatus = byKey["general_notes"]?.status ?? null
const taName = course.ta?.name ?? course.ta?.email ?? null
```

- [ ] **Step 3: Update `ReviewProgressSummary` to accept and show 4 sections**

Find the `ReviewProgressSummary` function. Replace its entire implementation with:

```tsx
function ReviewProgressSummary({
  metaStatus, matrixStatus, syllabusStatus, issueLogStatus,
}: {
  metaStatus: "draft" | "submitted" | null
  matrixStatus: "draft" | "submitted" | null
  syllabusStatus: "draft" | "submitted" | null
  issueLogStatus: "draft" | "submitted" | null
}) {
  const tiles = [
    { label: "Metadata",     status: metaStatus,     icon: FileText },
    { label: "Review Matrix", status: matrixStatus,   icon: ListChecks },
    { label: "Syllabus & GB", status: syllabusStatus, icon: BookOpen },
    { label: "Issue Log",     status: issueLogStatus, icon: AlertTriangle },
  ]

  const submittedCount = [metaStatus, matrixStatus, syllabusStatus, issueLogStatus]
    .filter((s) => s === "submitted").length

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">TA Review Progress</CardTitle>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            submittedCount === 4
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : submittedCount > 0
                ? "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                : "bg-muted text-muted-foreground"
          )}>
            {submittedCount}/4 sections submitted
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(({ label, status, icon: Icon }) => {
            const isSubmitted = status === "submitted"
            const isDraft = status === "draft"
            return (
              <div
                key={label}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                  isSubmitted
                    ? "border-green-500/30 bg-green-500/10"
                    : isDraft
                      ? "border-orange-400/30 bg-orange-500/8"
                      : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className={cn("size-4", isSubmitted ? "text-green-600" : isDraft ? "text-orange-500" : "text-muted-foreground/50")} />
                  {isSubmitted ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : isDraft ? (
                    <Clock className="size-4 text-orange-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/30" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-widest mt-1",
                    isSubmitted ? "text-success" : isDraft ? "text-warning" : "text-muted-foreground/40",
                  )}>
                    {isSubmitted ? "Submitted" : isDraft ? "Draft saved" : "Not started"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

Update the call site in `CourseReviewDetail` from:

```tsx
<ReviewProgressSummary metaStatus={metaStatus} matrixStatus={matrixStatus} syllabusStatus={syllabusStatus} />
```

to:

```tsx
<ReviewProgressSummary
  metaStatus={metaStatus}
  matrixStatus={matrixStatus}
  syllabusStatus={syllabusStatus}
  issueLogStatus={issueLogStatus}
/>
```

- [ ] **Step 4: Add `taName` prop to `MetadataCard` and render it**

Find the `MetadataCard` function. Update its props type and body:

```tsx
function MetadataCard({
  data,
  responseStatus,
  taName,
}: {
  data: MetadataResponseData | undefined
  responseStatus: "draft" | "submitted" | null
  taName: string | null
}) {
  return (
    <CollapsibleCard title="Metadata" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Term" value={data.term} />
          <Field
            label="Sections"
            value={data.section_numbers?.length ? data.section_numbers.join(", ") : null}
          />
          <Field label="Brightspace URL" value={data.brightspace_url} />
          <Field label="Moodle URL" value={data.moodle_url} />
          <div className="sm:col-span-2">
            <Field label="Migration Notes" value={data.migration_notes} />
          </div>
          {taName && (
            <div className="sm:col-span-2">
              <Field label="Reviewer (TA)" value={taName} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data saved yet.</p>
      )}
    </CollapsibleCard>
  )
}
```

Update the `MetadataCard` call site in `CourseReviewDetail` from:

```tsx
<MetadataCard data={meta} responseStatus={metaStatus} />
```

to:

```tsx
<MetadataCard data={meta} responseStatus={metaStatus} taName={taName} />
```

- [ ] **Step 5: Add `IssueLogCard` component**

Paste this new component into `course-review-detail.tsx`, after the `SyllabusCard` function:

```tsx
const WORKSPACE_ISSUE_STATUS: Record<string, { label: string; className: string }> = {
  open:      { label: "Open",      className: "text-orange-600 dark:text-orange-400" },
  fixed:     { label: "Fixed",     className: "text-emerald-600 dark:text-emerald-400" },
  escalated: { label: "Escalated", className: "text-purple-600 dark:text-purple-400" },
  resolved:  { label: "Resolved",  className: "text-emerald-600 dark:text-emerald-400" },
}

const WORKSPACE_SEVERITY: Record<string, { label: string; className: string }> = {
  minor:    { label: "Minor",    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  major:    { label: "Major",    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  critical: { label: "Critical", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
}

function IssueLogCard({
  data,
  responseStatus,
}: {
  data: IssueLogResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const issues = data?.issues?.filter((i) => i.description?.trim() || i.type?.trim()) ?? []

  return (
    <CollapsibleCard title="Issue Log" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues logged in the TA review.</p>
      ) : (
        <div className="grid gap-2">
          {issues.map((issue) => {
            const sev = WORKSPACE_SEVERITY[issue.severity] ?? WORKSPACE_SEVERITY.minor
            const stat = WORKSPACE_ISSUE_STATUS[issue.status] ?? WORKSPACE_ISSUE_STATUS.open
            return (
              <div
                key={issue.id}
                className="flex flex-col gap-1 rounded-md border border-border p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{issue.type}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", sev.className)}>
                        {sev.label}
                      </span>
                      <span className={cn("text-xs font-semibold", stat.className)}>
                        {stat.label}
                      </span>
                    </div>
                    {issue.location && (
                      <p className="text-xs text-muted-foreground">
                        Location: <span className="font-mono">{issue.location}</span>
                      </p>
                    )}
                    {issue.description?.trim() && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {issue.description}
                      </p>
                    )}
                  </div>
                  {issue.direct_link?.trim() && (
                    <a
                      href={issue.direct_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CollapsibleCard>
  )
}
```

- [ ] **Step 6: Render `IssueLogCard` in `CourseReviewDetail`**

In the `CourseReviewDetail` return, after `<SyllabusCard data={syllabus} responseStatus={syllabusStatus} />`, add:

```tsx
<IssueLogCard data={issueLog} responseStatus={issueLogStatus} />
```

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(dashboard)/admin/courses/[id]/_components/course-review-detail.tsx"
git commit -m "feat: add TA name and issue log section to admin course review detail"
```
