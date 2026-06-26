# Instructor Course Chat — Design Spec

**Date:** 2026-06-26  
**Branch:** `ft-instructor-course-chat`  
**Status:** Approved for implementation

---

## Problem

The instructor course view has two separate interaction surfaces:

- **Questions tab** — instructor raises a titled question (stored as a `course_issue`); admin/TA reply in a thread per question
- **Discussion tab** — free-form shared comments (`course_comments` with `visibility = 'instructor_visible'`)

This is confusing. Instructors don't know which to use. Both are low-fidelity and static (no real-time updates, no unified history).

## Goal

Replace both surfaces with a single unified chat per course, where instructor, admin, and assigned TAs share one timeline. Instructor can optionally flag a message as a question; admin/TA can mark it answered. Existing data migrates in automatically.

---

## Approach

Extend the existing `course_comments` table (Approach A). Minimal schema change, reuses proven data access layer, safe migration with backup tables.

---

## Data Model

### Schema migration

```sql
-- Backup before touching anything
CREATE TABLE course_issues_questions_backup
  AS SELECT * FROM course_issues WHERE type = 'question';

CREATE TABLE course_issue_comments_backup
  AS SELECT cic.*
     FROM course_issue_comments cic
     INNER JOIN course_issues ci ON ci.id = cic.issue_id
     WHERE ci.type = 'question';

-- New columns on course_comments
ALTER TABLE course_comments
  ADD COLUMN IF NOT EXISTS is_question  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_answered  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migrated_from_issue_id uuid REFERENCES course_issues(id);
```

### Data migration (idempotent, run inside a transaction)

1. **Questions → comments**: For each `course_issues` row where `type = 'question'`, insert one `course_comment` with `visibility = 'instructor_visible'`, `is_question = true`, body = `title + '\n\n' + description` (if description present), preserving `course_id`, `created_by` as `author_id`, `created_at`. Guard: skip if `migrated_from_issue_id` already exists for that issue id.

2. **Issue replies → flat comments**: For each `course_issue_comments` row on a question issue where `is_system_message = false`, insert a `course_comment` with `visibility = 'instructor_visible'`, `is_question = false`, preserving `author_id`, `body`, `created_at`, `course_id` (from parent issue). Guard: skip duplicates by checking `(course_id, author_id, body, created_at)`.

3. **Existing `instructor_visible` course_comments**: No change — they appear in the unified chat automatically.

After migration, `course_issues` of `type = 'question'` are frozen (no new writes). The backup tables allow full reversal if needed.

---

## Backend

### Repository contract (`lib/repositories/contracts.ts`)

- Add to `CourseComment`:
  ```ts
  is_question: boolean
  is_answered: boolean
  ```
- Add to `PostCourseCommentInput`:
  ```ts
  isQuestion?: boolean
  ```
- Add to `CommentRepository`:
  ```ts
  markCommentAnswered(commentId: string): Promise<void>
  ```

### Repository impl (`lib/repositories/postgres/comment-repository.ts`)

- `listCourseComments`: SELECT `is_question`, `is_answered` from `course_comments`
- `postCourseComment`: INSERT `is_question` (default false)
- New `markCommentAnswered`: `UPDATE course_comments SET is_answered = true WHERE id = $1`

### `postSharedCommentAction` (`lib/actions/shared-comment-actions.ts`)

Add `isQuestion: boolean = false` parameter.

When `isQuestion = true`, after inserting the comment:
- Check current course status; if `sent_to_instructor` or `instructor_viewing`, transition to `instructor_questions` (same logic currently in `instructorRaiseQuestionAction`)

Revalidate `/instructor/courses/${courseId}` and `/admin/courses/${courseId}`.

### `instructorRaiseQuestionAction` (`app/(dashboard)/instructor/courses/[id]/actions.ts`)

Becomes a thin wrapper:
```ts
export async function instructorRaiseQuestionAction(courseId, title, description?) {
  const body = description?.trim()
    ? `${title.trim()}\n\n${description.trim()}`
    : title.trim()
  await postSharedCommentAction(courseId, body, true)
}
```

Remove `createIssueAction` import and call. Remove `getIssueCommentsAction` and `postIssueCommentAction` (no longer called from UI).

### New `markAnsweredAction` (`lib/actions/shared-comment-actions.ts`)

```ts
export async function markAnsweredAction(courseId: string, commentId: string): Promise<void>
```

- PBAC: allowed roles = `admin_full`, `super_admin`, `standard_user` (TA)
- Calls `markCommentAnswered(commentId)`
- Revalidates instructor and admin course paths

### Unchanged

- `instructorSignOffAction` — unchanged. Uses `getIssuesForCourseAction` to list open non-question issues for the approval checklist. After migration, question issues are frozen, so this list stays clean.
- `getIssuesForCourseAction` — unchanged. Used by approve flow and the admin issue tracker.
- Admin's `CourseChat` component (`/admin/courses/[id]`) — unchanged. Internal-only channel stays separate for admin/TA.

---

## UI

### New component: `CourseChatPanel`

Replaces `CourseDiscussion`. Location: `app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx`

**Props:**
```ts
interface Props {
  courseId: string
  comments: CourseComment[]   // instructor_visible, sorted ASC by created_at
  currentUserId: string
  canPost: boolean            // false when readOnly
  canMarkAnswered: boolean    // true for admin/TA roles
}
```

**Layout:**

```
┌─────────────────────────────────────┐
│ 💬 Course Chat                       │
│ Visible to instructor, admin & TA   │
├─────────────────────────────────────┤
│                                     │
│  [Avatar] Name · TA · 2h ago        │
│  ┌──────────────────────────────┐   │
│  │ Regular message bubble       │   │
│  └──────────────────────────────┘   │
│                                     │
│  [Avatar] Name · Instructor · 1h ago│
│  ┌──────────────────────────────┐   │
│  │ ❓ Question message bubble   │   │
│  │                [Mark answered]│  │  ← visible to admin/TA only
│  └──────────────────────────────┘   │
│                                     │
│  [Avatar] Name · Admin · 30m ago    │
│  ┌──────────────────────────────┐   │
│  │ Reply message bubble         │   │
│  └──────────────────────────────┘   │
│                                     │
│  [Avatar] Name · Instructor · 1h ago│
│  ┌──────────────────────────────┐   │
│  │ ✓ Answered question bubble   │   │
│  └──────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│ [Textarea ──────────────────] [?][→]│
│  Shift+Enter for newline            │
└─────────────────────────────────────┘
```

**Question flag UX:**
- Composer has a `?` icon button (toggle). Off by default (grey), on = amber.
- When toggled on, placeholder changes to "Type your question — visible to admin & TA…"
- On send: calls `postSharedCommentAction(courseId, body, isQuestion)` and resets toggle

**Message rendering:**
- `is_question = true, is_answered = false`: amber left-border on bubble + small amber `❓ Question` badge top-right; admin/TA see "Mark answered" button below bubble
- `is_question = true, is_answered = true`: green left-border + `✓ Answered` badge; no button
- Regular message: no badge, existing chat-bubble style

**Auto-scroll:** scroll to bottom on new comment (same as existing `CourseDiscussion`).

### `InstructorAccordionView` changes

- Remove `"questions"` tab + all associated state (`questions`, `askOpen`, `qTitle`, `qDescription`, `askPending`)
- Remove `"discussion"` tab
- Remove `QuestionItem` usage
- Tabs become: `summary` · `review` · `chat` · `approve` (4 tabs)
- Chat tab renders `CourseChatPanel` (fills height, own scroll — same pattern as current discussion tab)
- Badge on Chat tab: count of unanswered questions (`sharedComments.filter(c => c.is_question && !c.is_answered).length`)

### `InstructorSimpleWizard` step 2 changes

Remove:
- "Yes, I have a question" card and the inline `askOpen` form
- `askPending`, `title`, `description` state
- `instructorRaiseQuestionAction` import

Replace with: single "Have a question? Open the chat" button that calls `onRequestChat?.()` (new optional prop) — the shell switches to Full Details mode and activates the Chat tab.

If `onRequestChat` not provided (shouldn't happen), fall back to `onStepChange(2)`.

The "No, it looks fine → Continue" button still goes to step 2 (approve).

### `InstructorCourseShell` changes

Pass `onRequestChat` down to `InstructorSimpleWizard`. When called: `setMode("full")` + emit a tab-switch event to the accordion via a shared state atom or a simple callback prop passed into `full`.

Implementation: lift `activeTab` state up into `InstructorCourseShell`, pass it as prop to `InstructorAccordionView` so the wizard can drive tab selection.

---

## Migration file

New file: `db/migrations/20260626000000_instructor_chat_unification.sql`

Wrapped in `BEGIN` / `COMMIT`. Idempotent guards on every INSERT. Backup tables created first.

---

## Files changed (summary)

| File | Change |
|------|--------|
| `db/migrations/20260626000000_instructor_chat_unification.sql` | New — schema + data migration |
| `lib/repositories/contracts.ts` | Add `is_question`, `is_answered`, `markCommentAnswered` |
| `lib/repositories/postgres/comment-repository.ts` | Read/write new columns |
| `lib/actions/shared-comment-actions.ts` | Add `isQuestion` param, add `markAnsweredAction` |
| `app/(dashboard)/instructor/courses/[id]/actions.ts` | Simplify `instructorRaiseQuestionAction`, remove dead actions |
| `components/shared/course-discussion.tsx` | Keep for now (still used by admin); no change |
| `app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx` | **New** |
| `app/(dashboard)/instructor/courses/[id]/_components/instructor-accordion-view.tsx` | Replace questions+discussion tabs with chat tab |
| `app/(dashboard)/instructor/courses/[id]/_components/instructor-simple-wizard.tsx` | Replace step-2 question form with chat link |
| `app/(dashboard)/instructor/courses/[id]/_components/instructor-course-shell.tsx` | Lift `activeTab` state, wire `onRequestChat` |
| `app/(dashboard)/instructor/courses/[id]/page.tsx` | Pass `sharedComments` with new fields |

---

## Out of scope

- Real-time updates (SSE) — not in this iteration; page refresh reflects new messages
- Admin course view chat panel — unchanged; admin uses their existing `CourseChat` (internal + shared tabs)
- Notification emails when messages are posted — existing email flow unchanged
- Deleting or editing messages — not added
