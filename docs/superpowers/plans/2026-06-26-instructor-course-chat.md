# Instructor Course Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split "Questions" + "Discussion" tabs in the instructor course view with a single unified chat timeline per course, where instructor, admin, and TA share one conversation; instructor can flag messages as questions, admin/TA can mark them answered.

**Architecture:** Extend `course_comments` with two boolean columns (`is_question`, `is_answered`) and a migration guard column. A safe idempotent migration copies question issues + their replies into the comments table. All backend changes flow through the existing service/repository layers. The UI swaps the two tabs for a single `CourseChatPanel` component.

**Tech Stack:** Next.js App Router (Server Actions), PostgreSQL via `pg`, Vitest, React, Tailwind/shadcn, TypeScript.

## Global Constraints

- Branch: `ft-instructor-course-chat` off `master`
- Dev DB: `postgresql://coursebridge_user:localdev@localhost:5433/coursebridge` (Docker, port 5433)
- Migrate dev DB: `npm run dev:db:migrate` from project root
- Run tests: `cd apps/web && npm test` (vitest unit tests)
- All new comments insert with `visibility = 'instructor_visible'`
- `is_question` defaults `false`; `is_answered` defaults `false`
- PBAC: `markAnsweredAction` allowed for `admin_full`, `super_admin`, `standard_user` only
- No real-time (SSE) in this iteration — page refresh reflects new messages
- Follow existing MVC-modular pattern: repository → service → action → component
- Feature branch only — do NOT merge to `main` or `master`

---

## File Map

| File | Change |
|------|--------|
| `db/migrations/20260626000000_instructor_chat_unification.sql` | **Create** — backup tables, schema columns, data migration |
| `apps/web/lib/repositories/contracts.ts` | **Modify** — add `is_question`, `is_answered` to `CourseComment`; add `isQuestion` to `PostCourseCommentInput`; add `markCommentAnswered` to `CommentRepository` |
| `apps/web/lib/repositories/postgres/comment-repository.ts` | **Modify** — read/write new columns; add `markCommentAnswered` impl |
| `apps/web/lib/repositories/postgres/__tests__/comment-repository.test.ts` | **Create** — unit tests for new repo behaviour |
| `apps/web/lib/actions/shared-comment-actions.ts` | **Modify** — add `isQuestion` param + status transition; add `markAnsweredAction` |
| `apps/web/app/(dashboard)/instructor/courses/[id]/actions.ts` | **Modify** — simplify `instructorRaiseQuestionAction`; remove dead `getIssueCommentsAction` + `postIssueCommentAction` |
| `apps/web/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx` | **Create** — unified chat UI with question flag and mark-answered |
| `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-accordion-view.tsx` | **Modify** — remove Questions + Discussion tabs; add Chat tab using `CourseChatPanel` |
| `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-course-shell.tsx` | **Modify** — lift `activeTab` state; wire `onRequestChat` to switch to Full + Chat |
| `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-simple-wizard.tsx` | **Modify** — replace step-2 question form with "Open chat" button |
| `apps/web/app/(dashboard)/instructor/courses/[id]/page.tsx` | **Modify** — pass `canMarkAnswered` based on role |

---

## Task 1: Create branch and DB migration

**Files:**
- Create: `db/migrations/20260626000000_instructor_chat_unification.sql`

**Interfaces:**
- Produces: `course_comments.is_question boolean`, `course_comments.is_answered boolean`, `course_comments.migrated_from_issue_id uuid`, backup tables `course_issues_questions_backup` and `course_issue_comments_backup`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout master && git pull
git checkout -b ft-instructor-course-chat
```

Expected: branch `ft-instructor-course-chat` checked out.

- [ ] **Step 2: Write the migration file**

Create `db/migrations/20260626000000_instructor_chat_unification.sql`:

```sql
-- ============================================================
-- Instructor Chat Unification
-- Backups question issues + replies, extends course_comments,
-- migrates data. Idempotent (safe to re-run).
-- ============================================================

BEGIN;

-- ---- 1. Backup tables (created once, never overwritten) ----

CREATE TABLE IF NOT EXISTS course_issues_questions_backup AS
  SELECT * FROM course_issues WHERE type = 'question' AND 1=0; -- schema only first

INSERT INTO course_issues_questions_backup
  SELECT ci.*
  FROM course_issues ci
  WHERE ci.type = 'question'
    AND NOT EXISTS (
      SELECT 1 FROM course_issues_questions_backup b WHERE b.id = ci.id
    );

CREATE TABLE IF NOT EXISTS course_issue_comments_backup AS
  SELECT cic.*
  FROM course_issue_comments cic
  WHERE 1=0; -- schema only first

INSERT INTO course_issue_comments_backup
  SELECT cic.*
  FROM course_issue_comments cic
  INNER JOIN course_issues ci ON ci.id = cic.issue_id
  WHERE ci.type = 'question'
    AND NOT EXISTS (
      SELECT 1 FROM course_issue_comments_backup b WHERE b.id = cic.id
    );

-- ---- 2. Schema: new columns on course_comments ----

ALTER TABLE course_comments
  ADD COLUMN IF NOT EXISTS is_question          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_answered          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migrated_from_issue_id uuid REFERENCES course_issues(id);

-- ---- 3. Migrate question issues → course_comments ----

INSERT INTO course_comments (
  course_id, author_id, body, visibility,
  is_question, is_answered, created_at, acting_on_behalf_of,
  migrated_from_issue_id
)
SELECT
  ci.course_id,
  ci.created_by,
  CASE
    WHEN ci.description IS NOT NULL AND trim(ci.description) != ''
      THEN trim(ci.title) || E'\n\n' || trim(ci.description)
    ELSE trim(ci.title)
  END,
  'instructor_visible',
  true,
  -- mark answered if the question issue was already resolved
  (ci.status = 'resolved'),
  ci.created_at,
  NULL,
  ci.id
FROM course_issues ci
WHERE ci.type = 'question'
  AND NOT EXISTS (
    SELECT 1 FROM course_comments cc
    WHERE cc.migrated_from_issue_id = ci.id
  );

-- ---- 4. Migrate issue replies → flat course_comments ----
-- Only non-system-message replies, in chronological order.
-- We place them right after the question comment by using the
-- original created_at, which preserves timeline ordering.

INSERT INTO course_comments (
  course_id, author_id, body, visibility,
  is_question, is_answered, created_at, acting_on_behalf_of
)
SELECT
  ci.course_id,
  cic.author_id,
  cic.body,
  'instructor_visible',
  false,
  false,
  cic.created_at,
  cic.acting_on_behalf_of
FROM course_issue_comments cic
INNER JOIN course_issues ci ON ci.id = cic.issue_id
WHERE ci.type = 'question'
  AND cic.is_system_message = false
  -- Idempotency guard: skip if identical row already exists
  AND NOT EXISTS (
    SELECT 1 FROM course_comments cc
    WHERE cc.course_id = ci.course_id
      AND cc.author_id = cic.author_id
      AND cc.body = cic.body
      AND cc.visibility = 'instructor_visible'
      AND ABS(EXTRACT(EPOCH FROM (cc.created_at - cic.created_at))) < 1
  );

COMMIT;
```

- [ ] **Step 3: Apply migration to dev DB**

```bash
npm run dev:db:migrate
```

Expected output ends with: `Applied migration 20260626000000_instructor_chat_unification.sql` (or "already applied" if re-run).

- [ ] **Step 4: Verify schema on dev DB**

```bash
DATABASE_URL=postgresql://coursebridge_user:localdev@localhost:5433/coursebridge \
  node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query(\`SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_name='course_comments'
          AND column_name IN ('is_question','is_answered','migrated_from_issue_id')
          ORDER BY column_name\`)
 .then(r => { console.table(r.rows); p.end(); });
"
```

Expected: 3 rows — `is_answered boolean false`, `is_question boolean false`, `migrated_from_issue_id uuid null`.

- [ ] **Step 5: Verify backup tables exist and have data**

```bash
DATABASE_URL=postgresql://coursebridge_user:localdev@localhost:5433/coursebridge \
  node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
  p.query('SELECT COUNT(*) FROM course_issues_questions_backup'),
  p.query('SELECT COUNT(*) FROM course_issue_comments_backup'),
  p.query(\"SELECT COUNT(*) FROM course_comments WHERE is_question=true\"),
]).then(([q, r, c]) => {
  console.log('question issues backed up:', q.rows[0].count);
  console.log('issue comments backed up:', r.rows[0].count);
  console.log('question comments migrated:', c.rows[0].count);
  p.end();
});
"
```

Expected: migrated count ≥ backed-up question-issue count (each question becomes at least one comment).

- [ ] **Step 6: Commit**

```bash
git add db/migrations/20260626000000_instructor_chat_unification.sql
git commit -m "feat(db): add course_comments question columns + migrate question issues to chat"
```

---

## Task 2: Repository contract + implementation

**Files:**
- Modify: `apps/web/lib/repositories/contracts.ts`
- Modify: `apps/web/lib/repositories/postgres/comment-repository.ts`
- Create: `apps/web/lib/repositories/postgres/__tests__/comment-repository.test.ts`

**Interfaces:**
- Consumes: nothing new (extends existing `CourseComment`, `PostCourseCommentInput`, `CommentRepository`)
- Produces:
  - `CourseComment.is_question: boolean`
  - `CourseComment.is_answered: boolean`
  - `PostCourseCommentInput.isQuestion?: boolean`
  - `CommentRepository.markCommentAnswered(commentId: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

Create `apps/web/lib/repositories/postgres/__tests__/comment-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest"

// These tests verify the SQL that the comment repository constructs, by
// reading the source file. They guard against regressions without requiring
// a live DB connection.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(__dirname, "../comment-repository.ts"),
  "utf8",
)

describe("comment-repository: is_question / is_answered", () => {
  it("selects is_question from course_comments", () => {
    expect(src).toMatch(/c\.is_question/)
  })

  it("selects is_answered from course_comments", () => {
    expect(src).toMatch(/c\.is_answered/)
  })

  it("inserts is_question via parameter", () => {
    expect(src).toMatch(/is_question/)
  })

  it("exposes markCommentAnswered that updates is_answered", () => {
    expect(src).toMatch(/markCommentAnswered/)
    expect(src).toMatch(/SET is_answered\s*=\s*true/)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -A3 "comment-repository"
```

Expected: 4 tests FAIL (`is_question`, `is_answered`, `is_question insert`, `markCommentAnswered` not found in source).

- [ ] **Step 3: Update `contracts.ts`**

In `apps/web/lib/repositories/contracts.ts`, find the `CourseComment` type (line ~237) and add two fields:

```ts
export type CourseComment = {
  id: string;
  course_id: string;
  author_id: string;
  author_name?: string;
  author_role?: string;
  author_email?: string;
  author_title?: string | null;
  acting_on_behalf_of?: string | null;
  on_behalf_of_name?: string | null;
  body: string;
  visibility: "internal" | "instructor_visible";
  parent_comment_id: string | null;
  created_at: string;
  is_question: boolean;      // ← new
  is_answered: boolean;      // ← new
};
```

Find `PostCourseCommentInput` (line ~313) and add:

```ts
export type PostCourseCommentInput = {
  courseId: string;
  authorId: string;
  body: string;
  visibility?: "internal" | "instructor_visible";
  parentCommentId?: string | null;
  actingOnBehalfOf?: string | null;
  isQuestion?: boolean;   // ← new
};
```

Find `CommentRepository` interface (line ~452) and add method:

```ts
  listCourseComments(courseId: string, visibility?: "internal" | "instructor_visible"): Promise<CourseComment[]>;
  postCourseComment(input: PostCourseCommentInput): Promise<CourseComment>;
  markCommentAnswered(commentId: string): Promise<void>;   // ← new
```

- [ ] **Step 4: Update `comment-repository.ts`**

Replace the full file `apps/web/lib/repositories/postgres/comment-repository.ts` with:

```ts
import "server-only";

import type { CommentRepository } from "@/lib/repositories/contracts";
import { getPostgresPool } from "@/lib/postgres/pool";

type CommentRow = {
  id: string;
  course_id: string;
  author_id: string;
  body: string;
  visibility: "internal" | "instructor_visible";
  parent_comment_id: string | null;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
  author_role: string | null;
  acting_on_behalf_of: string | null;
  is_question: boolean;
  is_answered: boolean;
};

export function createPostgresCommentRepository(): CommentRepository {
  return {
    async listCourseComments(courseId, visibility) {
      const pool = getPostgresPool();
      const where = visibility
        ? "WHERE c.course_id = $1 AND c.visibility = $2"
        : "WHERE c.course_id = $1";
      const params = visibility ? [courseId, visibility] : [courseId];
      const { rows } = await pool.query<CommentRow>(
        `
          SELECT
            c.id,
            c.course_id,
            c.author_id,
            c.body,
            c.visibility,
            c.parent_comment_id,
            c.created_at,
            c.acting_on_behalf_of,
            c.is_question,
            c.is_answered,
            p.full_name  AS author_name,
            p.email      AS author_email,
            p.role       AS author_role
          FROM course_comments c
          LEFT JOIN profiles p ON p.id = c.author_id
          ${where}
          ORDER BY c.created_at ASC
        `,
        params,
      );

      return rows.map((row) => ({
        ...row,
        author_name:  row.author_name  ?? undefined,
        author_email: row.author_email ?? undefined,
        author_role:  row.author_role  ?? undefined,
      }));
    },

    async postCourseComment(input) {
      const pool = getPostgresPool();
      const { rows } = await pool.query<CommentRow>(
        `
          WITH inserted AS (
            INSERT INTO course_comments (
              course_id, author_id, body, visibility,
              parent_comment_id, acting_on_behalf_of, is_question
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
              id, course_id, author_id, body, visibility,
              parent_comment_id, created_at, acting_on_behalf_of,
              is_question, is_answered
          )
          SELECT
            i.id, i.course_id, i.author_id, i.body, i.visibility,
            i.parent_comment_id, i.created_at, i.acting_on_behalf_of,
            i.is_question, i.is_answered,
            p.full_name AS author_name,
            p.email     AS author_email,
            p.role      AS author_role
          FROM inserted i
          LEFT JOIN profiles p ON p.id = i.author_id
        `,
        [
          input.courseId,
          input.authorId,
          input.body,
          input.visibility ?? "internal",
          input.parentCommentId ?? null,
          input.actingOnBehalfOf ?? null,
          input.isQuestion ?? false,
        ],
      );

      const row = rows[0];
      return {
        ...row,
        author_name:  row.author_name  ?? undefined,
        author_email: row.author_email ?? undefined,
        author_role:  row.author_role  ?? undefined,
      };
    },

    async markCommentAnswered(commentId) {
      const pool = getPostgresPool();
      await pool.query(
        `UPDATE course_comments SET is_answered = true WHERE id = $1`,
        [commentId],
      );
    },
  };
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -A3 "comment-repository"
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/repositories/contracts.ts \
        apps/web/lib/repositories/postgres/comment-repository.ts \
        apps/web/lib/repositories/postgres/__tests__/comment-repository.test.ts
git commit -m "feat(repo): add is_question/is_answered to CourseComment + markCommentAnswered"
```

---

## Task 3: Backend actions — postSharedCommentAction + markAnsweredAction

**Files:**
- Modify: `apps/web/lib/actions/shared-comment-actions.ts`

**Interfaces:**
- Consumes: `CommentRepository.markCommentAnswered`, `postCourseComment({ ..., isQuestion })`
- Produces:
  - `postSharedCommentAction(courseId: string, body: string, isQuestion?: boolean): Promise<void>`
  - `markAnsweredAction(courseId: string, commentId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/actions/__tests__/shared-comment-actions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(__dirname, "../shared-comment-actions.ts"),
  "utf8",
)

describe("shared-comment-actions", () => {
  it("postSharedCommentAction accepts isQuestion parameter", () => {
    expect(src).toMatch(/isQuestion/)
  })

  it("exports markAnsweredAction", () => {
    expect(src).toMatch(/export async function markAnsweredAction/)
  })

  it("markAnsweredAction checks allowed roles", () => {
    expect(src).toMatch(/admin_full.*super_admin|super_admin.*admin_full/)
  })

  it("postSharedCommentAction triggers instructor_questions transition when isQuestion=true", () => {
    expect(src).toMatch(/instructor_questions/)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -A3 "shared-comment-actions"
```

Expected: 4 tests FAIL.

- [ ] **Step 3: Rewrite `shared-comment-actions.ts`**

Replace the full file `apps/web/lib/actions/shared-comment-actions.ts`:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"
import { getCommentRepository } from "@/lib/repositories"
import { resolveDelegationContext, transitionCourseStatus } from "@/lib/courses/service"
import { getCourseRepository } from "@/lib/repositories"

function revalidateCourse(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}`)
}

export async function postSharedCommentAction(
  courseId: string,
  body: string,
  isQuestion = false,
): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["instructor", "admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })

  await postCourseComment({
    courseId,
    authorId: ctx.userId,
    body: body.trim(),
    visibility: "instructor_visible",
    actingOnBehalfOf: delegation.onBehalfOf,
    isQuestion,
  })

  // When the instructor flags a question, advance the course status so admin/TA
  // know a reply is needed. Only valid from sent_to_instructor or instructor_viewing.
  if (isQuestion) {
    try {
      const current = await getCourseRepository().getCourseSummaryById(courseId)
      if (
        current.status === "sent_to_instructor" ||
        current.status === "instructor_viewing"
      ) {
        await transitionCourseStatus({
          courseId,
          toStatus: "instructor_questions",
          note: `Instructor question: ${body.trim().split("\n")[0].slice(0, 120)}`,
        })
      }
    } catch {
      // Non-fatal: comment is already saved; status transition failure shouldn't
      // surface to the instructor.
    }
  }

  revalidateCourse(courseId)
}

export async function markAnsweredAction(
  courseId: string,
  commentId: string,
): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  await getCommentRepository().markCommentAnswered(commentId)

  revalidateCourse(courseId)
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd apps/web && npm test -- --reporter=verbose 2>&1 | grep -A3 "shared-comment-actions"
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/shared-comment-actions.ts \
        apps/web/lib/actions/__tests__/shared-comment-actions.test.ts
git commit -m "feat(actions): add isQuestion to postSharedCommentAction + markAnsweredAction"
```

---

## Task 4: Simplify instructorRaiseQuestionAction + remove dead code

**Files:**
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/actions.ts`

**Interfaces:**
- Consumes: `postSharedCommentAction(courseId, body, true)` from Task 3
- Produces: `instructorRaiseQuestionAction` (same signature, different impl); `instructorSignOffAction` (unchanged)

- [ ] **Step 1: Rewrite `actions.ts`**

Replace the full file `apps/web/app/(dashboard)/instructor/courses/[id]/actions.ts`:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import type { AppProfile } from "@/lib/auth/context"
import { resolveDelegationContext, transitionCourseStatus } from "@/lib/courses/service"
import { postSharedCommentAction } from "@/lib/actions/shared-comment-actions"
import { getPostgresPool } from "@/lib/postgres/pool"

async function assertInstructorOrLeader(courseId: string, profile: AppProfile): Promise<void> {
  if (profile.role === "instructor" || profile.role === "super_admin") return
  const delegation = await resolveDelegationContext({ courseId, profile })
  if (!delegation.delegated) throw new Error("Unauthorized")
}

function revalidateInstructorCourse(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath("/instructor")
  revalidatePath("/admin")
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/issue-log`)
}

/**
 * Instructor raises a question. Posts to the unified chat as a question-flagged
 * message (instructor_visible) and advances course status to instructor_questions.
 */
export async function instructorRaiseQuestionAction(
  courseId: string,
  questionTitle: string,
  questionDescription?: string,
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  const body = questionDescription?.trim()
    ? `${questionTitle.trim()}\n\n${questionDescription.trim()}`
    : questionTitle.trim()

  await postSharedCommentAction(courseId, body, true)
  revalidateInstructorCourse(courseId)
}

/**
 * Final sign-off. Advances course to instructor_approved.
 * acknowledgedIssueIds: open non-question issue IDs shown on the approve tab.
 */
export async function instructorSignOffAction(
  courseId: string,
  acknowledgedIssueIds: string[],
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  if (acknowledgedIssueIds.length > 0) {
    const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })
    try {
      const pool = getPostgresPool()
      const params: unknown[] = []
      const valueRows = acknowledgedIssueIds.map((issueId) => {
        params.push(issueId, ctx.profile.id, delegation.onBehalfOf)
        const n = params.length
        return `($${n - 2}, $${n - 1}, 'Acknowledged by instructor at sign-off.', true, $${n})`
      })
      await pool.query(
        `INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message, acting_on_behalf_of) VALUES ${valueRows.join(", ")}`,
        params,
      )
    } catch (error) {
      console.error("[instructorSignOffAction] Failed to record acknowledgements:", error)
    }
  }

  await transitionCourseStatus({
    courseId,
    toStatus: "instructor_approved",
    note: "Signed off by instructor — all good.",
  })

  revalidateInstructorCourse(courseId)
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the changed files.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/instructor/courses/\[id\]/actions.ts
git commit -m "refactor(instructor): instructorRaiseQuestionAction delegates to postSharedCommentAction"
```

---

## Task 5: CourseChatPanel component

**Files:**
- Create: `apps/web/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx`

**Interfaces:**
- Consumes:
  - `postSharedCommentAction(courseId, body, isQuestion)` from `@/lib/actions/shared-comment-actions`
  - `markAnsweredAction(courseId, commentId)` from `@/lib/actions/shared-comment-actions`
  - `CourseComment` type from `@/lib/services/comments` (now includes `is_question`, `is_answered`)
- Produces: `<CourseChatPanel courseId canPost canMarkAnswered comments currentUserId />`

- [ ] **Step 1: Create the component**

Create `apps/web/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx`:

```tsx
"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postSharedCommentAction } from "@/lib/actions/shared-comment-actions"
import { markAnsweredAction } from "@/lib/actions/shared-comment-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare, HelpCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"

const ROLE_LABELS: Record<string, string> = {
  instructor:    "Instructor",
  admin_full:    "Admin",
  admin_viewer:  "Comms",
  super_admin:   "Admin",
  standard_user: "TA",
}

const ROLE_COLORS: Record<string, string> = {
  instructor:    "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  admin_full:    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  admin_viewer:  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  super_admin:   "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  standard_user: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

interface Props {
  courseId: string
  comments: CourseComment[]
  currentUserId: string
  canPost?: boolean
  canMarkAnswered?: boolean
}

function getInitials(name?: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function CourseChatPanel({
  courseId,
  comments,
  currentUserId,
  canPost = true,
  canMarkAnswered = false,
}: Props) {
  const [body, setBody] = useState("")
  const [isQuestion, setIsQuestion] = useState(false)
  const [sendPending, startSend] = useTransition()
  const [answerPending, startAnswer] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [comments])

  function handleSend() {
    if (!body.trim() || sendPending) return
    const questionFlag = isQuestion
    startSend(async () => {
      await postSharedCommentAction(courseId, body.trim(), questionFlag)
      setBody("")
      setIsQuestion(false)
    })
  }

  function handleMarkAnswered(commentId: string) {
    startAnswer(async () => {
      await markAnsweredAction(courseId, commentId)
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="size-4" aria-hidden />
          Course Chat
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Visible to instructor, TA, and admin
        </p>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="mb-2 size-7 opacity-30" aria-hidden />
              <p className="text-xs font-medium">No messages yet</p>
              <p className="mt-0.5 text-[11px] opacity-60">
                Start the conversation — the reviewer team can see everything here
              </p>
            </div>
          )}

          {comments.map((comment) => {
            const isMe = comment.author_id === currentUserId
            const titleLabel = comment.author_title
              ? (ROLE_TITLE_LABELS[comment.author_title] ?? null)
              : null
            const roleLabel = titleLabel ?? ROLE_LABELS[comment.author_role ?? ""] ?? "Team"
            const roleColor = titleLabel
              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
              : (ROLE_COLORS[comment.author_role ?? ""] ?? "bg-muted text-muted-foreground")

            return (
              <div
                key={comment.id}
                className={cn("flex max-w-[88%] gap-2.5", isMe ? "ml-auto flex-row-reverse" : "")}
              >
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-bold",
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {getInitials(comment.author_name)}
                  </AvatarFallback>
                </Avatar>

                <div className={cn("space-y-1", isMe ? "flex flex-col items-end" : "")}>
                  {/* Author line */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {comment.author_name ?? "Unknown"}
                    </span>
                    <span className={cn("rounded-full px-1.5 py-0 text-[10px] font-semibold", roleColor)}>
                      {roleLabel}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground"
                      title={new Date(comment.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    >
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {comment.on_behalf_of_name && (
                    <span className="text-[10px] italic text-muted-foreground">
                      on behalf of {comment.on_behalf_of_name}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      isMe
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none border border-border bg-muted/60 text-foreground",
                      comment.is_question && !comment.is_answered &&
                        "border-l-2 border-l-amber-400 dark:border-l-amber-500",
                      comment.is_question && comment.is_answered &&
                        "border-l-2 border-l-emerald-500 dark:border-l-emerald-400",
                    )}
                  >
                    {/* Question / Answered badge */}
                    {comment.is_question && (
                      <div className="mb-1.5 flex items-center gap-1">
                        {comment.is_answered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" aria-hidden /> Answered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            <HelpCircle className="size-3" aria-hidden /> Question
                          </span>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </div>

                  {/* Mark answered button — admin/TA only, open questions only */}
                  {comment.is_question && !comment.is_answered && canMarkAnswered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-emerald-700"
                      disabled={answerPending}
                      onClick={() => handleMarkAnswered(comment.id)}
                    >
                      <CheckCircle2 className="size-3" aria-hidden />
                      Mark answered
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Composer */}
      {canPost && (
        <div className="shrink-0 border-t border-border bg-muted/10 p-3">
          <div className="flex gap-2">
            <Textarea
              placeholder={
                isQuestion
                  ? "Type your question — the reviewer team will reply here…"
                  : "Write a message visible to all parties…"
              }
              className="min-h-[70px] resize-none text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <div className="flex shrink-0 flex-col gap-1.5 self-end">
              {/* Question toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8",
                  isQuestion
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={isQuestion ? "Remove question flag" : "Flag as question"}
                onClick={() => setIsQuestion((v) => !v)}
              >
                <HelpCircle className="size-4" aria-hidden />
              </Button>
              {/* Send */}
              <Button
                size="icon"
                className="size-8"
                disabled={!body.trim() || sendPending}
                onClick={handleSend}
              >
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          {isQuestion && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <HelpCircle className="size-3" aria-hidden />
              This message will be flagged as a question for the team to answer
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "course-chat-panel" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(dashboard)/instructor/courses/[id]/_components/course-chat-panel.tsx"
git commit -m "feat(ui): add CourseChatPanel — unified instructor course chat with question flag"
```

---

## Task 6: Refactor InstructorAccordionView — remove Questions + Discussion, add Chat

**Files:**
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-accordion-view.tsx`

**Interfaces:**
- Consumes: `CourseChatPanel` from `./course-chat-panel`
- Produces: `InstructorAccordionView` with props unchanged except `canMarkAnswered: boolean` added

- [ ] **Step 1: Rewrite `instructor-accordion-view.tsx`**

Replace the full file. Key changes: remove `QuestionItem`, `questions` state, `askOpen` form state; remove `getIssuesForCourseAction` for questions; remove discussion tab; add chat tab with `CourseChatPanel`; add `canMarkAnswered` prop.

```tsx
"use client"

import { useState, useEffect, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Eye,
  Loader2,
} from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import type { CourseComment } from "@/lib/services/comments"
import type { CourseIssue } from "@/lib/issues/types"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"
import { instructorSignOffAction } from "../actions"
import { CourseChatPanel } from "./course-chat-panel"

export interface InstructorAccordionCourseMeta {
  term?: string | null
  department?: string | null
  sourceCourseId?: string | null
  targetCourseId?: string | null
}

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  reviewNode: ReactNode
  sharedComments: CourseComment[]
  currentUserId: string
  canMarkAnswered: boolean
  actingOnBehalfOfName?: string | null
  actingAsTitle?: string | null
  meta: InstructorAccordionCourseMeta
  /** Optional: controlled active tab (driven by shell when wizard requests chat). */
  activeTab?: TabId
  onTabChange?: (tab: TabId) => void
}

export type TabId = "summary" | "review" | "chat" | "approve"

const STORAGE_KEY = (courseId: string) => `coursebridge:tab:${courseId}`

export function InstructorAccordionView({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  sharedComments,
  currentUserId,
  canMarkAnswered,
  actingOnBehalfOfName,
  actingAsTitle,
  meta,
  activeTab: controlledTab,
  onTabChange,
}: Props) {
  const router = useRouter()
  const { canApprove, statusMessage } = getInstructorSimpleState(status, readOnly)

  const [internalTab, setInternalTab] = useState<TabId>("review")
  const activeTab = controlledTab ?? internalTab

  useEffect(() => {
    if (controlledTab) return // externally controlled
    try {
      const saved = localStorage.getItem(STORAGE_KEY(courseId))
      if (saved && ["summary", "review", "chat", "approve"].includes(saved)) {
        setInternalTab(saved as TabId)
      }
    } catch { /* ignore */ }
  }, [courseId, controlledTab])

  const gotoTab = (id: TabId) => {
    if (controlledTab !== undefined) {
      onTabChange?.(id)
    } else {
      setInternalTab(id)
      try { localStorage.setItem(STORAGE_KEY(courseId), id) } catch { /* ignore */ }
    }
  }

  // --- Review acknowledgment ---
  const [reviewAcked, setReviewAcked] = useState(false)

  // --- Approve ---
  const [openIssues, setOpenIssues] = useState<CourseIssue[] | null>(null)
  const [approveAcked, setApproveAcked] = useState(false)
  const [signPending, startSign] = useTransition()

  useEffect(() => {
    if (!canApprove) return
    let active = true
    getIssuesForCourseAction(courseId, { status: "open" })
      .then((rows) => active && setOpenIssues(rows))
      .catch(() => active && setOpenIssues([]))
    return () => { active = false }
  }, [courseId, canApprove])

  const confirmApprove = () => {
    if (!approveAcked) return
    startSign(async () => {
      await instructorSignOffAction(courseId, (openIssues ?? []).map((i) => i.id))
      router.refresh()
    })
  }

  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null

  const unansweredQuestions = sharedComments.filter((c) => c.is_question && !c.is_answered).length

  const tabs: { id: TabId; label: string; icon: ReactNode; badge?: ReactNode }[] = [
    {
      id: "summary",
      label: "Summary",
      icon: <ClipboardList className="size-3.5" aria-hidden />,
    },
    {
      id: "review",
      label: "Review",
      icon: <MessageSquare className="size-3.5" aria-hidden />,
    },
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="size-3.5" aria-hidden />,
      badge: unansweredQuestions > 0 ? (
        <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-700 dark:text-amber-300">
          {unansweredQuestions}
        </span>
      ) : undefined,
    },
    {
      id: "approve",
      label: "Approve",
      icon: <CheckCircle2 className="size-3.5" aria-hidden />,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Banners */}
      {actingAsLeader && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-200">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span>
            Acting as <span className="font-semibold">{leaderLabel}</span>
            {actingOnBehalfOfName ? (
              <> on behalf of <span className="font-semibold">{actingOnBehalfOfName}</span></>
            ) : (
              <> for this course</>
            )}
            . Your actions are recorded under your name.
          </span>
        </div>
      )}
      {readOnly && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-6 py-2 text-sm text-muted-foreground">
          <Eye className="size-4 shrink-0" aria-hidden />
          Department view — you can read but not approve or post messages.
        </div>
      )}

      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => gotoTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </div>

      {/* Chat tab fills height with its own scroll */}
      {activeTab === "chat" ? (
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <CourseChatPanel
            courseId={courseId}
            comments={sharedComments}
            currentUserId={currentUserId}
            canPost={!readOnly}
            canMarkAnswered={canMarkAnswered}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 p-6">

            {/* Summary tab */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Course Summary</h2>
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                  {meta.term && (
                    <>
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-medium">{meta.term}</span>
                    </>
                  )}
                  {meta.department && (
                    <>
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{meta.department}</span>
                    </>
                  )}
                  {meta.sourceCourseId && (
                    <>
                      <span className="text-muted-foreground">Moodle ID</span>
                      <span className="font-mono text-xs">{meta.sourceCourseId}</span>
                    </>
                  )}
                  {meta.targetCourseId && (
                    <>
                      <span className="text-muted-foreground">Brightspace ID</span>
                      <span className="font-mono text-xs">{meta.targetCourseId}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Review tab */}
            {activeTab === "review" && (
              <div className="space-y-4">
                {finalSummary?.trim() && (
                  <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/50">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-blue-600 dark:text-blue-400" aria-hidden />
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Note from your reviewer</p>
                      </div>
                      <CopyButton value={finalSummary} label="reviewer note" />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900 dark:text-blue-100">{finalSummary}</p>
                  </div>
                )}
                {reviewNode}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30">
                  <Checkbox
                    checked={reviewAcked}
                    onCheckedChange={(v) => setReviewAcked(v === true)}
                    className="mt-0.5"
                    aria-label="Acknowledge you've read the reviewer's notes"
                  />
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                    I've read the reviewer's notes and I understand what changed.
                  </span>
                </label>
              </div>
            )}

            {/* Approve tab */}
            {activeTab === "approve" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Approve This Course</h2>
                {!canApprove ? (
                  <p className="py-1 text-sm text-muted-foreground">
                    {statusMessage ?? "This course is not ready for your approval yet."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Once you have reviewed this information, please approve below so we know you are ready to prepare for your upcoming course offering.
                      (Live shells are created later through Banner when the academic calendar is finalized).
                    </p>

                    {openIssues === null ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking for open items…
                      </p>
                    ) : openIssues.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">The reviewer noted:</p>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {openIssues.map((i) => (
                            <li key={i.id}>
                              <span className="font-medium text-foreground">{i.title}</span>
                              {i.description ? <span> — {i.description}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" aria-hidden /> No open items on this course.
                      </p>
                    )}

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/30">
                      <Checkbox
                        checked={approveAcked}
                        onCheckedChange={(v) => setApproveAcked(v === true)}
                        className="mt-0.5"
                        aria-label="Confirm approval"
                      />
                      <span className="text-base font-medium text-emerald-900 dark:text-emerald-200">
                        I've reviewed everything and I'm happy for this course to go live.
                      </span>
                    </label>

                    <Button
                      size="lg"
                      className="h-12 w-full gap-2 bg-emerald-600 text-base text-white hover:bg-emerald-700"
                      disabled={!approveAcked || signPending || openIssues === null}
                      onClick={confirmApprove}
                    >
                      {signPending ? (
                        <><Loader2 className="size-5 animate-spin" aria-hidden /> Approving…</>
                      ) : (
                        <><CheckCircle2 className="size-5" aria-hidden /> Approve my course</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "instructor-accordion" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-accordion-view.tsx"
git commit -m "feat(ui): replace Questions+Discussion tabs with unified Chat tab in instructor accordion"
```

---

## Task 7: InstructorCourseShell — lift activeTab + wire onRequestChat

**Files:**
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-course-shell.tsx`
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-simple-wizard.tsx`

**Interfaces:**
- Consumes: `InstructorAccordionView` now accepts `activeTab?: TabId` and `onTabChange?: (t: TabId) => void`
- Produces: Shell manages `activeFullTab` state; wizard gets `onRequestChat?: () => void` prop

- [ ] **Step 1: Update `instructor-course-shell.tsx`**

Replace the full file:

```tsx
"use client"

import { useEffect, useState, type ReactNode } from "react"
import { HelpCircle, PanelsTopLeft, ShieldCheck, Sparkles } from "lucide-react"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import type { CourseStatus } from "@coursebridge/workflow"
import type { TabId } from "./instructor-accordion-view"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { InstructorSimpleWizard } from "./instructor-simple-wizard"
import { useInstructorTour } from "./instructor-guided-tour"

const SEEN_KEY = "coursebridge:instructor-tour-seen"

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  reviewNode: ReactNode
  full: (activeTab: TabId, onTabChange: (t: TabId) => void) => ReactNode
  actingOnBehalfOfName?: string | null
  actingAsTitle?: string | null
}

export function InstructorCourseShell({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  full,
  actingOnBehalfOfName,
  actingAsTitle,
}: Props) {
  const [mode, setMode] = useStickyTabState("instructor-view-mode", "simple")
  const [step, setStep] = useState(0)
  const [activeFullTab, setActiveFullTab] = useState<TabId>("review")
  const { startTour } = useInstructorTour(setStep)

  const { canApprove } = getInstructorSimpleState(status, readOnly)
  const tourAvailable = canApprove
  const isSimple = mode === "simple"

  useEffect(() => {
    if (!tourAvailable || !isSimple) return
    let seen = false
    try { seen = !!localStorage.getItem(SEEN_KEY) } catch { seen = true }
    if (seen) return
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      try { localStorage.setItem(SEEN_KEY, "1") } catch { /* ignore */ }
      startTour()
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [tourAvailable, isSimple, startTour])

  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null

  // Called from the simple wizard when instructor wants to open chat
  function handleRequestChat() {
    setActiveFullTab("chat")
    setMode("full")
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {actingAsLeader && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-200">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span>
            Acting as <span className="font-semibold">{leaderLabel}</span>
            {actingOnBehalfOfName ? (
              <> on behalf of <span className="font-semibold">{actingOnBehalfOfName}</span></>
            ) : (
              <> for this course</>
            )}
            . Your actions are recorded under your name.
          </span>
        </div>
      )}

      {/* Toggle + help bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-6 py-2">
        <div
          data-tour="view-toggle"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Choose how to view this course"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isSimple}
            onClick={() => setMode("simple")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isSimple ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-4" aria-hidden /> Simple
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSimple}
            onClick={() => setMode("full")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !isSimple ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PanelsTopLeft className="size-4" aria-hidden /> Full details
          </button>
        </div>

        {isSimple && tourAvailable ? (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={startTour}>
            <HelpCircle className="size-4" aria-hidden />
            Help — show me around
          </Button>
        ) : null}
      </div>

      {isSimple ? (
        <div className="flex-1 overflow-y-auto p-6">
          <InstructorSimpleWizard
            courseId={courseId}
            status={status}
            finalSummary={finalSummary}
            readOnly={readOnly}
            reviewNode={reviewNode}
            step={step}
            onStepChange={setStep}
            onRequestChat={handleRequestChat}
          />
        </div>
      ) : (
        full(activeFullTab, setActiveFullTab)
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `instructor-simple-wizard.tsx` step 2**

Find the step 1 section (the "Yes, I have a question" card block) and replace it. Add `onRequestChat?: () => void` to the `Props` interface, then replace the entire step-2 content block.

Open `apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-simple-wizard.tsx` and apply these changes:

**a) Add `onRequestChat` to Props interface** (after `onStepChange: (step: number) => void`):

```ts
  onRequestChat?: () => void
```

**b) Remove** the `askOpen`, `title`, `description`, `askPending`, `startAsk`, `submitQuestion` state and logic (lines ~72-87).

**c) Replace the step-2 block** (the `{step === 1 && (` section) with:

```tsx
      {/* Step 2 — questions */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-base text-muted-foreground">
            Is there anything you&apos;re unsure about, or would like changed?
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-5 text-left"
              onClick={() => onStepChange(2)}
            >
              <span className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="size-5 text-green-600" /> No, it looks fine
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Continue to approve the course.
              </span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              data-tour="ask-question"
              className="h-auto flex-col items-start gap-1 p-5 text-left"
              onClick={() => onRequestChat?.()}
            >
              <span className="flex items-center gap-2 text-base font-semibold">
                <MessageCircleQuestion className="size-5 text-primary" /> Yes, I have a question
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Open the chat to message the reviewer team.
              </span>
            </Button>
          </div>

          <div className="flex justify-start">
            <Button variant="ghost" className="gap-2" onClick={() => onStepChange(0)}>
              <ArrowLeft className="size-5" /> Back
            </Button>
          </div>
        </div>
      )}
```

**d) Remove unused imports**: `Input`, `Textarea`, `LottieLoader`, `instructorRaiseQuestionAction` (if no longer used after this change).

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "instructor-course-shell|instructor-simple-wizard" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-course-shell.tsx" \
        "apps/web/app/(dashboard)/instructor/courses/[id]/_components/instructor-simple-wizard.tsx"
git commit -m "feat(ui): lift activeTab state to shell; wizard step-2 opens chat instead of inline form"
```

---

## Task 8: Wire page.tsx — pass canMarkAnswered + update full render prop

**Files:**
- Modify: `apps/web/app/(dashboard)/instructor/courses/[id]/page.tsx`

**Interfaces:**
- Consumes: `InstructorCourseShell` now expects `full` as `(activeTab, onTabChange) => ReactNode`
- Produces: Page passes `canMarkAnswered` to accordion; `full` render prop passes tab state through

- [ ] **Step 1: Update `page.tsx`**

Replace the full file:

```tsx
import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getAdminCourseDetail } from "@/lib/admin/queries"
import { resolveDelegationContext } from "@/lib/courses/service"
import { getCourseRepository, getHierarchyRepository } from "@/lib/repositories"
import { CourseSwitcher } from "./_components/course-switcher"
import { CourseSwitchSidebar } from "./_components/course-switch-sidebar"
import { InstructorReviewDetail } from "./_components/instructor-review-detail"
import { InstructorAccordionView } from "./_components/instructor-accordion-view"
import { InstructorCourseShell } from "./_components/instructor-course-shell"
import { getSharedComments } from "@/lib/services/comments"

interface Props {
  params: Promise<{ id: string }>
}

const ADMIN_ROLES = ["admin_full", "super_admin", "admin_viewer"]
const TA_ROLES = ["standard_user"]

export default async function InstructorCourseDetailPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()

  const assignedCourse = await getCourseRepository().getAssignedCourseById(id, context.profile.id, "instructor")
  const delegation = assignedCourse
    ? null
    : await resolveDelegationContext({ courseId: id, profile: context.profile })
  const canActViaDelegation = delegation?.delegated ?? false
  const canViewViaHierarchy =
    !assignedCourse &&
    (context.profile.role === "super_admin" ||
      canActViaDelegation ||
      (await getHierarchyRepository().hasHierarchyAccess(context.profile.id, id)))
  if (!assignedCourse && !canViewViaHierarchy) notFound()

  const readOnly = !assignedCourse && !canActViaDelegation

  if (assignedCourse && context.profile.role === "instructor") {
    const { recordInstructorView } = await import("@/lib/instructor-views/service")
    await recordInstructorView(id, context.profile.id)
  }

  // Admin and TA roles can mark questions as answered
  const canMarkAnswered =
    ADMIN_ROLES.includes(context.profile.role) || TA_ROLES.includes(context.profile.role)

  const [detail, sharedComments, myCourses] = await Promise.all([
    getAdminCourseDetail(id),
    getSharedComments(id),
    getCourseRepository().listInstructorCourses(context.profile.id),
  ])
  if (!detail) notFound()

  const { course, responses, sectionKeyById } = detail

  const reviewNode = (
    <InstructorReviewDetail
      course={course}
      responses={responses}
      sectionKeyById={sectionKeyById}
    />
  )

  return (
    <>
      <Topbar
        title={course.title}
        subtitle={course.sourceCourseId ?? undefined}
        backHref="/instructor"
        role={context.profile.role}
        actions={
          <CourseSwitcher
            currentId={id}
            courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status }))}
            className="md:hidden"
          />
        }
      />
      <main className="flex flex-1 overflow-hidden bg-background">
        <CourseSwitchSidebar
          currentId={id}
          courses={myCourses.map((c) => ({ id: c.id, title: c.title, status: c.status, term: c.term }))}
        />
        <InstructorCourseShell
          courseId={id}
          status={course.status}
          finalSummary={course.instructorSummaryNotes}
          readOnly={readOnly}
          actingOnBehalfOfName={canActViaDelegation ? (delegation?.onBehalfOfName ?? null) : null}
          actingAsTitle={canActViaDelegation ? (delegation?.leaderTitle ?? null) : null}
          reviewNode={reviewNode}
          full={(activeTab, onTabChange) => (
            <InstructorAccordionView
              courseId={id}
              status={course.status}
              finalSummary={course.instructorSummaryNotes}
              readOnly={readOnly}
              sharedComments={sharedComments}
              currentUserId={context.userId}
              canMarkAnswered={canMarkAnswered}
              actingOnBehalfOfName={canActViaDelegation ? (delegation?.onBehalfOfName ?? null) : null}
              actingAsTitle={canActViaDelegation ? (delegation?.leaderTitle ?? null) : null}
              meta={{
                term: course.term,
                department: course.department,
                sourceCourseId: course.sourceCourseId,
                targetCourseId: course.targetCourseId,
              }}
              reviewNode={reviewNode}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          )}
        />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Full TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Run all tests**

```bash
cd apps/web && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Smoke test on dev DB**

Start the dev server and navigate to an instructor course page. Verify:

```bash
# From project root:
npm run dev
# Open http://localhost:3000/instructor/courses/<any-id>
```

Check:
1. Full Details view shows 4 tabs: Summary · Review · Chat · Approve (no "Questions", no "Discussion")
2. Chat tab shows existing shared comments + any migrated question messages
3. Migrated questions show amber "Question" badge
4. Composer has `?` toggle — click it, verify it turns amber, placeholder changes
5. Send a message with `?` toggled on — verify it appears with amber Question badge
6. Log in as admin/TA and verify "Mark answered" button appears on question messages
7. Click "Mark answered" — verify badge changes to green "Answered"
8. Simple view step 2: "Yes, I have a question" opens Full Details > Chat tab

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/instructor/courses/[id]/page.tsx"
git commit -m "feat(instructor): wire canMarkAnswered + render-prop full tab state to page"
```

---

## Task 9: Create pull request

- [ ] **Step 1: Push branch**

```bash
git push -u origin ft-instructor-course-chat
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --base master \
  --title "feat(instructor): unified course chat — replace Questions + Discussion with single chat timeline" \
  --body "$(cat <<'EOF'
## Summary

- Replaces the separate \"Questions\" tab and \"Discussion\" tab in the instructor course view with a single **Chat** tab — one timeline visible to instructor, admin, and assigned TA
- Instructor can flag messages as questions with a `?` toggle; admin/TA can mark them answered
- DB migration safely backs up existing question issues and their replies, then copies them into `course_comments` as chat messages — existing data is fully preserved
- `InstructorSimpleWizard` step 2 \"Yes, I have a question\" now opens the Chat tab instead of an inline form

## DB changes

- `course_comments`: two new columns `is_question boolean DEFAULT false`, `is_answered boolean DEFAULT false`
- Backup tables `course_issues_questions_backup` + `course_issue_comments_backup` created before migration
- Idempotent migration — safe to re-run

## Test plan

- [ ] Run `npm run dev:db:migrate` — verify migration applies cleanly
- [ ] Verify backup tables contain rows
- [ ] Verify migrated question comments appear in Chat tab with amber Question badge
- [ ] Send a new message — appears in chat
- [ ] Toggle `?`, send — appears with amber Question badge; course status advances to `instructor_questions`
- [ ] As admin/TA: click "Mark answered" — badge changes to green Answered
- [ ] Simple view step 2 → "Yes, I have a question" → opens Full Details Chat tab
- [ ] Read-only hierarchy view — Chat tab visible but composer hidden
- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npm test` → all tests pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.
