# Handoff Staleness on /admin Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing instructor-handoff staleness buckets (fresh <3d / aging 3–6d / overdue 7+d) and by-instructor rollup on the main `/admin` dashboard — KPI cards + rollup + a "Sent" column in the Send to Instructors tab, and day-count chips on instructor-phase board cards.

**Architecture:** The server page `/admin/page.tsx` adds the existing `getInstructorHandoffData()` query to its `Promise.allSettled` batch and converts the result into a plain serializable `Record<courseId, staleness>` via a new pure helper (`handoff-lookup.ts`) — plain object because **Maps cannot cross the RSC → client-component boundary** (see the existing `instructorOpenedAt` Record at page.tsx:134). The existing `HandoffSummaryView` is rendered server-side and passed into the client `SendPanel` as a ReactNode slot (same pattern as `CoursesBoard`'s `listView` prop). All staleness UI degrades to today's exact rendering when the handoff query fails.

**Tech Stack:** Next.js App Router (RSC), TypeScript, Tailwind, vitest. Spec: `docs/superpowers/specs/2026-07-20-handoff-on-admin-dashboard-design.md`.

## Global Constraints

- Branch: `ft-handoff-on-dashboard` (already created off master; spec commit 4796149be is on it). NEVER commit to master; integration is via PR to master.
- Do NOT modify `apps/web/lib/admin/handoff-buckets.ts` (thresholds agingDays: 3 / overdueDays: 7 stay as-is) or anything under `/admin/stats`.
- No new SQL / repository methods — reuse `getInstructorHandoffData()`.
- Failure isolation: if `getInstructorHandoffData()` rejects, `/admin` must render exactly as today (no KPI section, no "Sent" column, no board chips, no crash).
- `instructor_approved` courses are deliberately absent from the tracker → they render "—" in the Sent column and get no board chip.
- All commands run from `apps/web/`: tests `npx vitest run <path>`, typecheck `npm run typecheck` (tsc --noEmit).
- Known baseline: master has 3 pre-existing failures in `classify-courses.test.ts` — those are NOT yours; green = no *new* failures.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Pure helper `buildHandoffLookup` (TDD)

**Files:**
- Create: `apps/web/lib/admin/handoff-lookup.ts`
- Test: `apps/web/lib/admin/__tests__/handoff-lookup.test.ts`

**Interfaces:**
- Consumes: `HandoffBucket` type from `apps/web/lib/admin/handoff-buckets.ts` (existing).
- Produces (Tasks 2–3 rely on these exact names):
  - `interface HandoffLookupEntry { daysSinceSent: number | null; bucket: HandoffBucket; opened: boolean }`
  - `type HandoffLookup = Record<string, HandoffLookupEntry>`
  - `function buildHandoffLookup(courses: readonly {id, daysSinceSent, bucket, opened}[] | null | undefined): HandoffLookup`
  - `HandoffCourseView[]` (from `queries.ts`) is structurally assignable to the input.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/admin/__tests__/handoff-lookup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildHandoffLookup } from "../handoff-lookup";
import type { HandoffBucket } from "../handoff-buckets";

const course = (over: {
  id: string;
  daysSinceSent?: number | null;
  bucket?: HandoffBucket;
  opened?: boolean;
}) => ({
  daysSinceSent: 9,
  bucket: "overdue" as HandoffBucket,
  opened: false,
  ...over,
});

describe("buildHandoffLookup", () => {
  it("returns an empty record for null, undefined, and empty input", () => {
    expect(buildHandoffLookup(null)).toEqual({});
    expect(buildHandoffLookup(undefined)).toEqual({});
    expect(buildHandoffLookup([])).toEqual({});
  });

  it("keys entries by course id and keeps only staleness fields", () => {
    const lookup = buildHandoffLookup([
      course({ id: "c1", daysSinceSent: 9, bucket: "overdue", opened: false }),
      course({ id: "c2", daysSinceSent: 4, bucket: "aging", opened: true }),
    ]);
    expect(lookup["c1"]).toEqual({ daysSinceSent: 9, bucket: "overdue", opened: false });
    expect(lookup["c2"]).toEqual({ daysSinceSent: 4, bucket: "aging", opened: true });
  });

  it("preserves a null daysSinceSent (missing send event stays fresh)", () => {
    const lookup = buildHandoffLookup([
      course({ id: "c3", daysSinceSent: null, bucket: "fresh" }),
    ]);
    expect(lookup["c3"]).toEqual({ daysSinceSent: null, bucket: "fresh", opened: false });
  });

  it("misses courses the tracker excludes (e.g. instructor_approved)", () => {
    const lookup = buildHandoffLookup([course({ id: "c1" })]);
    expect(lookup["not-in-tracker"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/admin/__tests__/handoff-lookup.test.ts`
Expected: FAIL — "Failed to resolve import ../handoff-lookup" (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/admin/handoff-lookup.ts`:

```ts
/**
 * Pure mapping from the handoff tracker's course list to a per-course lookup
 * for the /admin dashboard (Send tab column + board chips).
 *
 * Returns a plain Record, not a Map: the RSC page must pass it as a prop to
 * "use client" components, and Maps don't survive the RSC boundary. No DB,
 * no `server-only` — same import rules as handoff-buckets.ts.
 */
import type { HandoffBucket } from "./handoff-buckets";

export interface HandoffLookupEntry {
  daysSinceSent: number | null;
  bucket: HandoffBucket;
  opened: boolean;
}

/**
 * Keyed by course id. Courses the tracker excludes (instructor_approved, or
 * anything outside the three handoff statuses) are simply absent — consumers
 * treat a miss as "no staleness to show".
 */
export type HandoffLookup = Record<string, HandoffLookupEntry>;

interface HandoffLookupSource {
  id: string;
  daysSinceSent: number | null;
  bucket: HandoffBucket;
  opened: boolean;
}

export function buildHandoffLookup(
  courses: readonly HandoffLookupSource[] | null | undefined,
): HandoffLookup {
  const lookup: HandoffLookup = {};
  if (!courses) return lookup;
  for (const course of courses) {
    lookup[course.id] = {
      daysSinceSent: course.daysSinceSent,
      bucket: course.bucket,
      opened: course.opened,
    };
  }
  return lookup;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/admin/__tests__/handoff-lookup.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
cd apps/web && npm run typecheck
cd /mnt/data/projects/BrightBridge
git add apps/web/lib/admin/handoff-lookup.ts apps/web/lib/admin/__tests__/handoff-lookup.test.ts
git commit -m "feat(admin): pure handoff-lookup helper for dashboard staleness

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Send to Instructors tab — KPI summary + "Sent" column

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/page.tsx` (imports; query batch at :65-87; `sendPanel` prop at :200)
- Modify: `apps/web/app/(dashboard)/admin/_components/send-panel.tsx` (Props at :65-70; TabsContent at :127-134)
- Modify: `apps/web/app/(dashboard)/admin/_components/sent-courses-table.tsx` (Props :9-11; table header :36-43; row render :46-82)

**Interfaces:**
- Consumes: `buildHandoffLookup`, `HandoffLookup` from `@/lib/admin/handoff-lookup` (Task 1); existing `getInstructorHandoffData` from `@/lib/admin/queries`; existing `HandoffSummaryView` from `@/components/admin/handoff/handoff-summary`; existing `BucketBadge` from `@/components/admin/handoff/bucket-badge` (client-safe: it only type-imports from handoff-buckets).
- Produces: `SendPanel` accepts optional `handoffSummary?: React.ReactNode` and `handoffLookup?: HandoffLookup`; `SentCoursesTable` accepts optional `handoffLookup?: HandoffLookup`. Both omitted → renders exactly as today (this IS the failure-isolation path; Task 3 relies on `handoffData`/`handoffLookup` variables existing in page.tsx).

- [ ] **Step 1: Wire the query into `page.tsx`**

Add to the imports (line 4 area):

```ts
import { getAdminCoursesPage, getAdminOverviewData, getInstructorHandoffData, getReadyForInstructorCourses, getSentToInstructorCourses, type AdminCourseRow } from "@/lib/admin/queries"
import { buildHandoffLookup } from "@/lib/admin/handoff-lookup"
import { HandoffSummaryView } from "@/components/admin/handoff/handoff-summary"
```

Extend the `Promise.allSettled` batch — add a destructured name and a call, keeping positions aligned (after `r_sent`):

```ts
  const [
    r_courses,
    r_unassigned,
    r_tas,
    r_escalations,
    r_completed,
    r_assignments,
    r_overview,
    r_institution,
    r_ready,
    r_sent,
    r_handoff,
  ] = await Promise.allSettled([
    getAdminCoursesPage({ page, pageSize, search, status, statuses: phaseStatuses, taProfileId }),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "course_created" }),
    getProfilesByRole("standard_user"),
    getOpenEscalations(),
    getAdminCoursesPage({ page: 1, pageSize: 200, status: "final_approved" }),
    getCourseRepository().listRecentAssignments(20),
    getAdminOverviewData(),
    getSuperAdminData(),
    getReadyForInstructorCourses(),
    getSentToInstructorCourses(),
    getInstructorHandoffData(),
  ])
```

After `const sentToInstructor = ...` (line 102), add:

```ts
  // Handoff staleness is additive: a failure here must leave the dashboard
  // rendering exactly as it did before this feature existed.
  const handoffData = r_handoff.status === "fulfilled" ? r_handoff.value : null
  const handoffLookup = buildHandoffLookup(handoffData?.courses)
```

Replace the `sendPanel` prop (line 200):

```tsx
              sendPanel={
                <SendPanel
                  readyCourses={readyForInstructor}
                  sentCourses={sentToInstructor}
                  readOnly={isReadOnly}
                  handoffLookup={handoffData ? handoffLookup : undefined}
                  handoffSummary={
                    handoffData ? (
                      <HandoffSummaryView
                        summary={handoffData.summary}
                        byInstructor={handoffData.byInstructor}
                      />
                    ) : undefined
                  }
                />
              }
```

- [ ] **Step 2: Thread props through `send-panel.tsx`**

Add the type import (line 11 area):

```ts
import type { HandoffLookup } from "@/lib/admin/handoff-lookup";
```

Extend `Props` (:65-70):

```ts
type Props = {
  readyCourses: ReadyForInstructorCourse[];
  sentCourses: SentToInstructorCourse[];
  /** When true (admin_viewer), the export/send controls are hidden. */
  readOnly?: boolean;
  /** Server-rendered <HandoffSummaryView>; omitted when the handoff query failed. */
  handoffSummary?: React.ReactNode;
  /** Per-course staleness; omitted when the handoff query failed. */
  handoffLookup?: HandoffLookup;
};
```

Update the signature and the sent/all tab contents (:88, :127-134):

```tsx
export function SendPanel({ readyCourses, sentCourses, readOnly = false, handoffSummary, handoffLookup }: Props) {
```

```tsx
      <TabsContent value="sent" className="space-y-4">
        {handoffSummary}
        <SentCoursesTable courses={filteredSent} handoffLookup={handoffLookup} />
      </TabsContent>

      <TabsContent value="all" className="space-y-6">
        <BatchExportPanel courses={filteredReady} readOnly={readOnly} />
        {handoffSummary}
        <SentCoursesTable courses={filteredSent} handoffLookup={handoffLookup} />
      </TabsContent>
```

- [ ] **Step 3: Add the "Sent" column to `sent-courses-table.tsx`**

Add imports (top of file):

```ts
import { BucketBadge } from "@/components/admin/handoff/bucket-badge";
import type { HandoffLookup } from "@/lib/admin/handoff-lookup";
```

Extend Props:

```ts
type Props = {
  courses: SentToInstructorCourse[];
  /** Per-course staleness; when omitted (handoff query failed) the Sent column is hidden. */
  handoffLookup?: HandoffLookup;
};
```

Update the component — header gains a "Sent" column between Status and Last Updated, and the row map becomes a block body so each row can look up its staleness once:

```tsx
export function SentCoursesTable({ courses, handoffLookup }: Props) {
  const showStaleness = handoffLookup !== undefined;
```

Header row (replace :36-43):

```tsx
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Course</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Instructor</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                {showStaleness && (
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sent</th>
                )}
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
```

Row map (replace :46-82) — note `course.courseId` keys the lookup; a miss (e.g. `instructor_approved`, excluded from the tracker by design) renders "—":

```tsx
              {courses.map((course) => {
                const staleness = handoffLookup?.[course.courseId];
                return (
                  <tr
                    key={course.courseId}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
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
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {course.instructorEmail ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={course.status} className="h-5" />
                    </td>
                    {showStaleness && (
                      <td className="px-4 py-2.5">
                        {staleness ? (
                          <BucketBadge bucket={staleness.bucket} days={staleness.daysSinceSent} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-2.5">
                      {course.instructorEmail ? (
                        <InstructorPreviewButton
                          courseId={course.courseId}
                          instructorEmail={course.instructorEmail}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
```

(`BucketBadge` with a numeric `days` renders "9d" in the bucket colour; with `days: null` it falls back to the bucket label — both correct here.)

- [ ] **Step 4: Verify — typecheck and test suite**

Run: `cd apps/web && npm run typecheck`
Expected: exit 0, no errors.

Run: `cd apps/web && npx vitest run`
Expected: no NEW failures (the 3 pre-existing `classify-courses.test.ts` failures may appear — they exist on master and are out of scope).

- [ ] **Step 5: Commit**

```bash
cd /mnt/data/projects/BrightBridge
git add "apps/web/app/(dashboard)/admin/page.tsx" "apps/web/app/(dashboard)/admin/_components/send-panel.tsx" "apps/web/app/(dashboard)/admin/_components/sent-courses-table.tsx"
git commit -m "feat(admin): handoff staleness summary + Sent column in Send to Instructors tab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Day-count chips on instructor-phase board cards

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/_components/courses-board.tsx` (`BoardCard` type :25-32; `BoardCardItem` status row :359-361)
- Modify: `apps/web/app/(dashboard)/admin/page.tsx` (board card mapping :142-153)

**Interfaces:**
- Consumes: `handoffLookup` variable in page.tsx (Task 2); `BucketBadge` + `HandoffBucket` type.
- Produces: `BoardCard` gains optional `bucket?: HandoffBucket` and `daysSinceSent?: number | null`. Cards without `bucket` (non-handoff statuses, `instructor_approved`, or failed query) render unchanged.

- [ ] **Step 1: Extend `BoardCard` and render the chip in `courses-board.tsx`**

Add imports (top of file):

```ts
import { BucketBadge } from "@/components/admin/handoff/bucket-badge"
import type { HandoffBucket } from "@/lib/admin/handoff-buckets"
```

Extend the type (:25-32):

```ts
export type BoardCard = {
  id: string
  title: string
  sourceCourseId: string | null
  taName: string | null
  status: CourseStatus
  updatedAt: string
  /** Handoff staleness — present only for courses the handoff tracker covers. */
  bucket?: HandoffBucket
  daysSinceSent?: number | null
}
```

In `BoardCardItem`, replace the status row (:359-361):

```tsx
      <div className="mt-2 flex items-center justify-between gap-2">
        <StatusBadge status={card.status} />
        {card.bucket && (
          <BucketBadge bucket={card.bucket} days={card.daysSinceSent ?? null} />
        )}
      </div>
```

- [ ] **Step 2: Feed staleness into the card mapping in `page.tsx`**

Replace the `.map((r) => ({...}))` inside `boardColumns` (:144-151):

```ts
      .map((r) => {
        const staleness = handoffLookup[r.id]
        return {
          id: r.id,
          title: r.title,
          sourceCourseId: r.sourceCourseId,
          taName: r.ta?.name ?? null,
          status: r.status,
          updatedAt: r.updatedAt,
          bucket: staleness?.bucket,
          daysSinceSent: staleness?.daysSinceSent ?? null,
        }
      })
```

(Only `sent_to_instructor` / `instructor_viewing` / `instructor_questions` courses exist in the lookup, so chips appear only in those columns; on query failure the lookup is empty and no card changes.)

- [ ] **Step 3: Verify — typecheck and test suite**

Run: `cd apps/web && npm run typecheck`
Expected: exit 0.

Run: `cd apps/web && npx vitest run`
Expected: no new failures vs the Task 2 baseline.

- [ ] **Step 4: Commit**

```bash
cd /mnt/data/projects/BrightBridge
git add "apps/web/app/(dashboard)/admin/_components/courses-board.tsx" "apps/web/app/(dashboard)/admin/page.tsx"
git commit -m "feat(admin): staleness day-chips on instructor-phase board cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification against the spec

**Files:** none created — verification only.

- [ ] **Step 1: Confirm untouched surfaces**

Run: `cd /mnt/data/projects/BrightBridge && git diff origin/master --stat -- apps/web/lib/admin/handoff-buckets.ts "apps/web/app/(dashboard)/admin/stats"`
Expected: empty output (thresholds and /admin/stats unchanged — spec success criteria 3).

- [ ] **Step 2: Full suite + typecheck from clean state**

Run: `cd apps/web && npm run typecheck && npx vitest run`
Expected: typecheck exit 0; only the 3 pre-existing `classify-courses.test.ts` failures (if they appear), nothing new. Record the exact pass/fail counts in the completion report.

- [ ] **Step 3: Failure-isolation spot check (code review, not runtime)**

Re-read the diff of `page.tsx` and confirm: `r_handoff` rejection → `handoffData = null` → `handoffSummary`/`handoffLookup` props are `undefined` → SendPanel/SentCoursesTable/board render today's markup (spec success criterion 4). If the live DB has data available locally, optionally load `/admin` → Send to Instructors tab and confirm the KPI cards, By Instructor table, Sent column, and board chips render (DB may be empty post-migration — an empty-state render is the expected result then).
