# Batch Instructor Mail-Merge Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Send to Instructors" admin tab where admins select multiple `ready_for_instructor` courses, export a mail-merge CSV (instructor name, email, Moodle URL, Brightspace URL, never-expiring magic link), and transition all courses to `sent_to_instructor` in one click — with real-time Supabase Realtime tracking of which instructors have opened their link.

**Architecture:** A new DB migration makes `review_invites.expires_at` nullable (NULL = never expires) and adds `access_count` / `first_accessed_at` tracking columns. The invite service gains a `neverExpires` flag and a `recordInviteAccess` function; the redemption route branches on link type. A new admin query fetches `ready_for_instructor` courses with their instructor + LMS URLs. A new server action mints permanent invites and transitions courses. A `BatchExportPanel` client component handles selection, CSV download, and Supabase Realtime subscription for live open-tracking.

**Tech Stack:** Next.js 15 App Router, TypeScript, Postgres (direct `pg` pool), Supabase Realtime (`@supabase/supabase-js`), Vitest, Tailwind / shadcn/ui

---

## File Map

| File | Change |
|---|---|
| `db/migrations/20260616000000_batch_export_invite_tracking.sql` | New — ALTER TABLE for nullable expires_at + tracking columns |
| `apps/web/lib/invites/service.ts` | Modify — neverExpires flag, recordInviteAccess, expiry-check fix |
| `apps/web/lib/invites/__tests__/service.test.ts` | New — unit tests for pure invite logic |
| `apps/web/app/auth/invite/[token]/route.ts` | Modify — branch on never-expiring vs one-time link |
| `apps/web/lib/admin/queries.ts` | Modify — add getReadyForInstructorCourses |
| `apps/web/app/(dashboard)/admin/actions.ts` | Modify — add batchExportAndSendAction |
| `apps/web/lib/supabase/browser-client.ts` | New — Supabase browser client for Realtime |
| `apps/web/app/(dashboard)/admin/_components/batch-export-panel.tsx` | New — selection table + CSV export + Realtime subscription |
| `apps/web/app/(dashboard)/admin/_components/admin-tabs.tsx` | Modify — add "Send to Instructors" tab |
| `apps/web/app/(dashboard)/admin/page.tsx` | Modify — fetch ready-for-instructor data, pass to new tab |
| `apps/web/.env.example` | Modify — add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY |
| `apps/web/package.json` | Modify — add @supabase/supabase-js |

---

## Task 1: DB Migration

**Files:**
- Create: `db/migrations/20260616000000_batch_export_invite_tracking.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- db/migrations/20260616000000_batch_export_invite_tracking.sql

-- NULL expires_at = never-expiring link (batch export magic links).
-- Existing rows keep their timestamp; only new batch-export invites use NULL.
ALTER TABLE review_invites ALTER COLUMN expires_at DROP NOT NULL;

-- Track how many times a never-expiring link has been clicked and when first clicked.
-- access_count stays 0 for one-time links (they use accepted_at instead).
ALTER TABLE review_invites
  ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN first_accessed_at TIMESTAMPTZ;
```

- [ ] **Step 2: Apply the migration against your local database**

```bash
DATABASE_URL="postgresql://coursebridge_user:localdev@localhost:5433/coursebridge" \
  node scripts/migrate.mjs
```

Expected: one `Applied migration: 20260616000000_batch_export_invite_tracking.sql` line then exits.

- [ ] **Step 3: Verify columns exist**

```bash
DATABASE_URL="postgresql://coursebridge_user:localdev@localhost:5433/coursebridge" \
  psql -c "\d review_invites"
```

Expected: `expires_at` shows no `not null` constraint; `access_count` and `first_accessed_at` columns are present.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/20260616000000_batch_export_invite_tracking.sql
git commit -m "feat: make review_invites.expires_at nullable, add access tracking columns"
```

---

## Task 2: Update Invite Service

**Files:**
- Modify: `apps/web/lib/invites/service.ts`
- Create: `apps/web/lib/invites/__tests__/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/invites/__tests__/service.test.ts`:

```ts
import { describe, it, expect } from "vitest";

// Pure helper extracted from service — tested in isolation (no DB needed).
// Import after implementation is in place.
import { shouldBlockExpired, shouldBlockAccepted } from "../service";

describe("shouldBlockExpired", () => {
  it("blocks when expires_at is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(shouldBlockExpired(past)).toBe(true);
  });

  it("does not block when expires_at is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(shouldBlockExpired(future)).toBe(false);
  });

  it("never blocks when expires_at is null (never-expiring)", () => {
    expect(shouldBlockExpired(null)).toBe(false);
  });
});

describe("shouldBlockAccepted", () => {
  it("blocks one-time links that have been accepted", () => {
    expect(shouldBlockAccepted("2026-06-14T10:00:00Z", "2026-06-15T00:00:00Z")).toBe(true);
  });

  it("does not block never-expiring links even if accepted_at is set", () => {
    // Never-expiring links are multi-use; accepted_at is never written for them
    // but the function must be safe regardless.
    expect(shouldBlockAccepted(null, "2026-06-15T00:00:00Z")).toBe(false);
  });

  it("does not block one-time links that have not been accepted yet", () => {
    expect(shouldBlockAccepted("2026-06-15T00:00:00Z", null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL — `shouldBlockExpired` and `shouldBlockAccepted` are not exported.

- [ ] **Step 3: Update `lib/invites/service.ts`**

Replace the entire file with:

```ts
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getPostgresPool } from "@/lib/postgres/pool";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ReviewInvite = {
  id: string;
  courseId: string;
  email: string;
  expiresAt: string | null;   // null = never-expiring batch export link
  acceptedAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  firstAccessedAt: string | null;
};

export type InstructorRecipient = {
  profileId: string;
  email: string;
  fullName: string | null;
};

export type RedeemResult =
  | { ok: true; invite: ReviewInvite }
  | { ok: false; reason: "not_found" | "revoked" | "accepted" | "expired" };

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function mapInvite(row: {
  id: string;
  course_id: string;
  email: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  access_count: number;
  first_accessed_at: string | null;
}): ReviewInvite {
  return {
    id: row.id,
    courseId: row.course_id,
    email: row.email,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    accessCount: row.access_count,
    firstAccessedAt: row.first_accessed_at,
  };
}

/** Pure helpers — exported for unit testing. */
export function shouldBlockExpired(expiresAt: string | null): boolean {
  if (expiresAt === null) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function shouldBlockAccepted(expiresAt: string | null, acceptedAt: string | null): boolean {
  if (expiresAt === null) return false; // never-expiring links are multi-use
  return acceptedAt !== null;
}

export async function getCourseInstructorRecipients(courseId: string): Promise<InstructorRecipient[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    profile_id: string;
    email: string | null;
    full_name: string | null;
  }>(
    `SELECT ca.profile_id, p.email, p.full_name
     FROM course_assignments ca
     INNER JOIN profiles p ON p.id = ca.profile_id
     WHERE ca.course_id = $1 AND ca.role = 'instructor'`,
    [courseId],
  );
  return rows.flatMap((row) => {
    if (!row.email) return [];
    return [{ profileId: row.profile_id, email: row.email, fullName: row.full_name ?? null }];
  });
}

/**
 * Creates an invite for an instructor.
 * Pass neverExpires: true for batch export links (no expiry, multi-use).
 * Default behaviour is a 7-day one-time link.
 */
export async function createReviewInvite(input: {
  courseId: string;
  email: string;
  createdBy: string;
  neverExpires?: boolean;
}): Promise<{ token: string; invite: ReviewInvite }> {
  const pool = getPostgresPool();
  const email = input.email.trim().toLowerCase();

  // Revoke any outstanding (un-accepted, un-revoked) link for this course+email.
  await pool.query(
    `UPDATE review_invites
     SET revoked_at = $1
     WHERE course_id = $2
       AND email = $3
       AND accepted_at IS NULL
       AND revoked_at IS NULL`,
    [new Date().toISOString(), input.courseId, email],
  );

  const token = randomBytes(32).toString("base64url");
  const expiresAt = input.neverExpires
    ? null
    : new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
  }>(
    `INSERT INTO review_invites (course_id, email, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, course_id, email, expires_at, accepted_at, revoked_at, access_count, first_accessed_at`,
    [input.courseId, email, hashToken(token), input.createdBy, expiresAt],
  );

  const data = rows[0];
  if (!data) throw new Error("Failed to create review invite: no row returned");
  return { token, invite: mapInvite(data) };
}

/** Validates a raw invite token without mutating state. */
export async function redeemReviewInvite(rawToken: string): Promise<RedeemResult> {
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    email: string;
    expires_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    access_count: number;
    first_accessed_at: string | null;
  }>(
    `SELECT id, course_id, email, expires_at, accepted_at, revoked_at, access_count, first_accessed_at
     FROM review_invites
     WHERE token_hash = $1
     LIMIT 1`,
    [hashToken(rawToken)],
  );

  const data = rows[0];
  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  if (shouldBlockAccepted(data.expires_at, data.accepted_at)) return { ok: false, reason: "accepted" };
  if (shouldBlockExpired(data.expires_at)) return { ok: false, reason: "expired" };

  return { ok: true, invite: mapInvite(data) };
}

/** Marks a one-time invite consumed. Do NOT call for never-expiring links. */
export async function markInviteAccepted(inviteId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE review_invites SET accepted_at = $1 WHERE id = $2`,
    [new Date().toISOString(), inviteId],
  );
}

/**
 * Records a click on a never-expiring invite link.
 * Increments access_count; sets first_accessed_at only on the first call.
 */
export async function recordInviteAccess(inviteId: string): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(
    `UPDATE review_invites
     SET access_count = access_count + 1,
         first_accessed_at = COALESCE(first_accessed_at, $1)
     WHERE id = $2`,
    [new Date().toISOString(), inviteId],
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && pnpm test
```

Expected: PASS — both `shouldBlockExpired` and `shouldBlockAccepted` suites green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/invites/service.ts apps/web/lib/invites/__tests__/service.test.ts
git commit -m "feat: add neverExpires flag and recordInviteAccess to invite service"
```

---

## Task 3: Update Invite Redemption Route

**Files:**
- Modify: `apps/web/app/auth/invite/[token]/route.ts`

- [ ] **Step 1: Update the route to branch on link type**

Replace `apps/web/app/auth/invite/[token]/route.ts` with:

```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  redeemReviewInvite,
  markInviteAccepted,
  recordInviteAccess,
} from "@/lib/invites/service";
import { ensureInstructorIdentity } from "@/lib/invites/instructor-identity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const expiredUrl = new URL("/auth/invite/expired", request.url);

  let invite;
  try {
    const result = await redeemReviewInvite(token);
    if (!result.ok) {
      return NextResponse.redirect(expiredUrl);
    }
    invite = result.invite;
  } catch (error) {
    console.error("[auth/invite] Failed to redeem invite:", error);
    return NextResponse.redirect(expiredUrl);
  }

  const nextPath = `/instructor/courses/${invite.courseId}`;
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", nextPath);

  try {
    const instructorProfileId = await ensureInstructorIdentity(invite.email);

    const isNeverExpiring = invite.expiresAt === null;
    if (isNeverExpiring) {
      // Multi-use permanent link: track access, do NOT mark accepted.
      await recordInviteAccess(invite.id);
    } else {
      // One-time link: consume it so it cannot be reused.
      await markInviteAccepted(invite.id);
    }

    const { recordInstructorView } = await import("@/lib/instructor-views/service");
    await recordInstructorView(invite.courseId, instructorProfileId);

    try {
      const { markInstructorViewingByLink } = await import("@/lib/courses/service");
      await markInstructorViewingByLink({ courseId: invite.courseId, instructorProfileId });
    } catch (statusError) {
      console.error("[auth/invite] Failed to mark instructor viewing:", statusError);
    }
  } catch (error) {
    console.error("[auth/invite] Bookkeeping failed; continuing to login redirect:", error);
  }

  return NextResponse.redirect(loginUrl);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/auth/invite/\[token\]/route.ts
git commit -m "feat: branch invite redemption on never-expiring vs one-time link"
```

---

## Task 4: New Admin Query — Ready-for-Instructor Courses

**Files:**
- Modify: `apps/web/lib/admin/queries.ts`

- [ ] **Step 1: Add the type and query to `lib/admin/queries.ts`**

Add after the existing imports and before the first `export`:

```ts
export type ReadyForInstructorCourse = {
  courseId: string;
  courseTitle: string;
  instructorName: string | null;
  instructorEmail: string;
  instructorProfileId: string;
  moodleUrl: string;
  brightspaceUrl: string;
};
```

Add this function at the end of the file:

```ts
/**
 * Returns all courses in ready_for_instructor status that have an assigned
 * instructor. Courses without an instructor are excluded (no invite target).
 * Pulls moodle_url and brightspace_url from the course_metadata review response.
 */
export async function getReadyForInstructorCourses(): Promise<ReadyForInstructorCourse[]> {
  const pool = getPostgresPool();

  const { rows } = await pool.query<{
    course_id: string;
    course_title: string;
    instructor_name: string | null;
    instructor_email: string;
    instructor_profile_id: string;
    moodle_url: string | null;
    brightspace_url: string | null;
  }>(
    `SELECT
       c.id                                                    AS course_id,
       c.title                                                 AS course_title,
       p.full_name                                             AS instructor_name,
       p.email                                                 AS instructor_email,
       ca.profile_id                                           AS instructor_profile_id,
       (rr.response_data ->> 'moodle_url')::text              AS moodle_url,
       (rr.response_data ->> 'brightspace_url')::text         AS brightspace_url
     FROM courses c
     INNER JOIN course_assignments ca ON ca.course_id = c.id AND ca.role = 'instructor'
     INNER JOIN profiles p ON p.id = ca.profile_id AND p.email IS NOT NULL
     LEFT JOIN review_sections rs ON rs.key = 'course_metadata'
     LEFT JOIN review_responses rr ON rr.course_id = c.id AND rr.section_id = rs.id
     WHERE c.status = 'ready_for_instructor'
     ORDER BY c.updated_at DESC`,
  );

  return rows.map((row) => ({
    courseId: row.course_id,
    courseTitle: row.course_title,
    instructorName: row.instructor_name,
    instructorEmail: row.instructor_email,
    instructorProfileId: row.instructor_profile_id,
    moodleUrl: row.moodle_url ?? "",
    brightspaceUrl: row.brightspace_url ?? "",
  }));
}
```

Also add `getPostgresPool` to the existing imports at the top of `queries.ts`:

```ts
import { getPostgresPool } from "@/lib/postgres/pool";
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/queries.ts
git commit -m "feat: add getReadyForInstructorCourses admin query"
```

---

## Task 5: New Server Action — Batch Export & Send

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/actions.ts`

- [ ] **Step 1: Add types and action to `actions.ts`**

Add these types near the top of the file (after existing type definitions):

```ts
export type BatchMailMergeRow = {
  instructorName: string;
  instructorEmail: string;
  courseTitle: string;
  moodleUrl: string;
  brightspaceUrl: string;
  magicLink: string;
};

export type BatchExportResult = {
  rows: BatchMailMergeRow[];
  skipped: number;
};
```

Add this action at the end of the file:

```ts
/**
 * For each selected course: mints a never-expiring magic link for the assigned
 * instructor, transitions the course to sent_to_instructor, and returns a row
 * for the mail-merge CSV. Courses without an instructor or that fail to
 * transition are skipped and counted in the returned skipped total.
 */
export async function batchExportAndSendAction(courseIds: string[]): Promise<BatchExportResult> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["admin_full", "super_admin"]);

  const { getReadyForInstructorCourses } = await import("@/lib/admin/queries");
  const { createReviewInvite, getCourseInstructorRecipients } = await import("@/lib/invites/service");
  const { buildInviteLink } = await import("@/lib/email/templates/instructor-invite");

  const allReady = await getReadyForInstructorCourses();
  const readyById = new Map(allReady.map((c) => [c.courseId, c]));

  const rows: BatchMailMergeRow[] = [];
  let skipped = 0;

  for (const courseId of courseIds) {
    const course = readyById.get(courseId);
    if (!course) {
      skipped++;
      continue;
    }

    try {
      const { token } = await createReviewInvite({
        courseId,
        email: course.instructorEmail,
        createdBy: ctx.userId,
        neverExpires: true,
      });

      await transitionCourseStatus({
        courseId,
        toStatus: "sent_to_instructor",
        note: "Sent to instructor via batch export.",
      });

      rows.push({
        instructorName: course.instructorName ?? "",
        instructorEmail: course.instructorEmail,
        courseTitle: course.courseTitle,
        moodleUrl: course.moodleUrl,
        brightspaceUrl: course.brightspaceUrl,
        magicLink: buildInviteLink(token),
      });
    } catch (error) {
      console.error(`[batchExportAndSendAction] Skipped course ${courseId}:`, error);
      skipped++;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/communications");
  revalidatePath("/instructor");

  return { rows, skipped };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/actions.ts
git commit -m "feat: add batchExportAndSendAction server action"
```

---

## Task 6: Supabase Browser Client

**Files:**
- Create: `apps/web/lib/supabase/browser-client.ts`
- Modify: `apps/web/.env.example`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install `@supabase/supabase-js`**

```bash
cd apps/web && pnpm add @supabase/supabase-js
```

Expected: package added to `apps/web/package.json`, lockfile updated.

- [ ] **Step 2: Create the browser client**

Create `apps/web/lib/supabase/browser-client.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

/**
 * Returns a singleton Supabase browser client for Realtime subscriptions.
 * Only needs the public URL and anon key — never the service-role key.
 */
export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for Realtime.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return client;
}
```

- [ ] **Step 3: Add env vars to `.env.example`**

Add after the `NEXT_PUBLIC_SITE_URL` block:

```
# Supabase — public credentials for Realtime subscriptions (invite open tracking).
# Get from Supabase Dashboard → Project Settings → API.
# NEVER use the service_role key here — these are sent to the browser.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Enable Realtime on `review_invites` in Supabase dashboard**

Manual step: In Supabase Dashboard → Database → Replication → Tables, enable `review_invites` for Realtime. Without this, the `postgres_changes` subscription will receive no events.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/supabase/browser-client.ts apps/web/.env.example apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add Supabase browser client for Realtime invite tracking"
```

---

## Task 7: Batch Export Panel UI

**Files:**
- Create: `apps/web/app/(dashboard)/admin/_components/batch-export-panel.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/app/(dashboard)/admin/_components/batch-export-panel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { batchExportAndSendAction, type BatchMailMergeRow } from "../actions";
import type { ReadyForInstructorCourse } from "@/lib/admin/queries";

type AccessState = {
  accessCount: number;
  firstAccessedAt: string | null;
};

function buildCsv(rows: BatchMailMergeRow[]): string {
  const header = [
    "Instructor Name",
    "Instructor Email",
    "Course Title",
    "Moodle URL",
    "Brightspace URL",
    "Magic Link",
  ];
  const escape = (v: string) => {
    const s = v.replace(/\r?\n/g, " ");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    header,
    ...rows.map((r) => [
      r.instructorName,
      r.instructorEmail,
      r.courseTitle,
      r.moodleUrl,
      r.brightspaceUrl,
      r.magicLink,
    ]),
  ]
    .map((cells) => cells.map(escape).join(","))
    .join("\n");
}

function downloadCsv(rows: BatchMailMergeRow[]) {
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `coursebridge-instructor-batch-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Props = {
  courses: ReadyForInstructorCourse[];
};

export function BatchExportPanel({ courses }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  // courseId → access state from Realtime updates
  const [accessMap, setAccessMap] = useState<Record<string, AccessState>>({});
  const channelRef = useRef<ReturnType<typeof getSupabaseBrowserClient>["channel"] | null>(null);

  const allSelected = courses.length > 0 && selectedIds.size === courses.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(courses.map((c) => c.courseId)));
  }

  function toggleOne(courseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  }

  function handleExport() {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await batchExportAndSendAction(ids);
      if (result.rows.length > 0) {
        downloadCsv(result.rows);
        toast.success(
          `Exported ${result.rows.length} course${result.rows.length !== 1 ? "s" : ""}${result.skipped > 0 ? `, skipped ${result.skipped} (no instructor assigned)` : ""}.`,
        );
        setSelectedIds(new Set());
      } else {
        toast.error(
          result.skipped > 0
            ? `All ${result.skipped} selected courses were skipped — check instructor assignments.`
            : "No courses exported.",
        );
      }
    });
  }

  // Supabase Realtime: watch for access_count changes on review_invites
  // for any course currently shown in this panel.
  useEffect(() => {
    if (courses.length === 0) return;

    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      // Supabase env vars not set in this environment — skip Realtime.
      return;
    }

    const channel = supabase
      .channel("batch-invite-access")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "review_invites",
        },
        (payload) => {
          const updated = payload.new as {
            course_id: string;
            access_count: number;
            first_accessed_at: string | null;
          };
          setAccessMap((prev) => ({
            ...prev,
            [updated.course_id]: {
              accessCount: updated.access_count,
              firstAccessedAt: updated.first_accessed_at,
            },
          }));
        },
      )
      .subscribe();

    channelRef.current = channel as unknown as ReturnType<typeof getSupabaseBrowserClient>["channel"];

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courses.length]);

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No courses are currently in "Ready for Instructor" status.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ready for Instructor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select courses to export a mail-merge CSV with never-expiring magic links. All selected
            courses will be marked <strong>Sent to Instructor</strong>.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-4 py-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Course</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Instructor</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Link Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const access = accessMap[course.courseId];
                  return (
                    <tr
                      key={course.courseId}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5">
                        <Checkbox
                          checked={selectedIds.has(course.courseId)}
                          onCheckedChange={() => toggleOne(course.courseId)}
                          aria-label={`Select ${course.courseTitle}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        <a
                          href={`/admin/courses/${course.courseId}`}
                          className="hover:underline"
                        >
                          {course.courseTitle}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {course.instructorName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{course.instructorEmail}</td>
                      <td className="px-4 py-2.5">
                        {access && access.accessCount > 0 ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Opened {access.accessCount}×
                            {access.firstAccessedAt
                              ? ` · first ${new Date(access.firstAccessedAt).toLocaleDateString()}`
                              : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet opened</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 backdrop-blur">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {selectedIds.size} course{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs"
              onClick={handleExport}
              disabled={isPending}
            >
              {isPending ? (
                <>Preparing CSV…</>
              ) : (
                <>
                  <Send className="size-3" />
                  Export CSV &amp; Send to Instructor
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/_components/batch-export-panel.tsx
git commit -m "feat: add BatchExportPanel with selection, CSV export, and Realtime tracking"
```

---

## Task 8: Wire Up Admin Tabs and Page

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/_components/admin-tabs.tsx`
- Modify: `apps/web/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Add the new tab to `admin-tabs.tsx`**

Add `sendPanel` prop and `readyCount` to the `Props` type and component:

```ts
type Props = {
  overviewPanel: React.ReactNode
  coursesPanel: React.ReactNode
  assignPanel: React.ReactNode
  instructorPanel: React.ReactNode
  escalationsPanel: React.ReactNode
  completedPanel: React.ReactNode
  migrationPanel: React.ReactNode
  institutionPanel: React.ReactNode
  assignmentLogsPanel: React.ReactNode
  sendPanel: React.ReactNode        // ← new
  unassignedCount: number
  openEscalationsCount: number
  readyForInstructorCount: number   // ← new
}
```

Add the tab trigger after the "Instructors" trigger:

```tsx
<TabsTrigger value="send">
  Send to Instructors
  {readyForInstructorCount > 0 && (
    <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
      {readyForInstructorCount.toLocaleString()}
    </span>
  )}
</TabsTrigger>
```

Add the tab content after the `<TabsContent value="instructor">` block:

```tsx
<TabsContent value="send">{sendPanel}</TabsContent>
```

Update the destructured props list in the function signature to include `sendPanel` and `readyForInstructorCount`.

- [ ] **Step 2: Update `admin/page.tsx`**

Add the import at the top:

```ts
import { BatchExportPanel } from "./_components/batch-export-panel";
import { getReadyForInstructorCourses } from "@/lib/admin/queries";
```

Add `getReadyForInstructorCourses()` to the `Promise.all` call (add as the last item):

```ts
const [coursesPage, unassignedPage, tas, openEscalations, completedPage, recentAssignments, overviewData, migrationReport, institutionData, readyForInstructor] = await Promise.all([
  // ... existing items ...
  getReadyForInstructorCourses(),
])
```

Pass the new props to `<AdminTabs>`:

```tsx
<AdminTabs
  // ... existing props ...
  sendPanel={<BatchExportPanel courses={readyForInstructor} />}
  readyForInstructorCount={readyForInstructor.length}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/_components/admin-tabs.tsx \
        apps/web/app/\(dashboard\)/admin/page.tsx
git commit -m "feat: wire BatchExportPanel into admin tabs as 'Send to Instructors'"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| Nullable expires_at migration | Task 1 |
| access_count + first_accessed_at columns | Task 1 |
| neverExpires flag on createReviewInvite | Task 2 |
| recordInviteAccess function | Task 2 |
| shouldBlockExpired / shouldBlockAccepted logic + tests | Task 2 |
| Redemption route branches on link type | Task 3 |
| getReadyForInstructorCourses query (instructor + LMS URLs) | Task 4 |
| batchExportAndSendAction — mint invite, transition, build row | Task 5 |
| CSV columns: name, email, title, moodle, brightspace, magic link | Task 5 + 7 |
| Supabase browser client singleton | Task 6 |
| Realtime subscription on review_invites | Task 7 |
| "Not yet opened" / "Opened N×" status column | Task 7 |
| Select all / individual checkboxes | Task 7 |
| Sticky export toolbar with count | Task 7 |
| Toast with skipped count | Task 7 |
| "Send to Instructors" tab with badge count | Task 8 |
| Admin page fetches ready-for-instructor courses | Task 8 |

### Type consistency check

- `ReviewInvite.expiresAt: string | null` — defined Task 2, used Task 3 (`invite.expiresAt === null`)
- `ReadyForInstructorCourse` — defined Task 4, imported in Task 7 panel and Task 8 page
- `BatchMailMergeRow` — defined Task 5, imported in Task 7 panel
- `BatchExportResult` — defined Task 5, destructured in Task 7 panel (`result.rows`, `result.skipped`)
- `batchExportAndSendAction` — defined Task 5, imported in Task 7 panel
- `getReadyForInstructorCourses` — defined Task 4, imported in Task 5 action and Task 8 page
- `recordInviteAccess` — defined Task 2, imported in Task 3 route
- All consistent ✓
