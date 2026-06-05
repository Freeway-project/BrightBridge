# Workflow Column Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every workflow column header read exactly like the backend status it holds, with one column per status, identical across all roles.

**Architecture:** `WORKFLOW_PHASES` in `packages/workflow/src/statuses.ts` becomes the single source — each phase's `groups` is rewritten to one group per `CourseStatus`, with the group label pulled from `COURSE_STATUS_LABELS` (so column header === card badge === backend status). The TA/staff list view (`course-list-view.tsx`) auto-follows because it already renders `phase.groups`. The admin board (`admin/page.tsx`) is refactored off its separate hardcoded `BOARD_COLUMNS` array to derive columns from the same `WORKFLOW_PHASES`, so the two boards can never diverge again.

**Tech Stack:** TypeScript, Vitest (workflow package), Next.js App Router (web app).

**Spec:** `docs/superpowers/specs/2026-06-05-workflow-column-labels-design.md`

---

## File Structure

- `packages/workflow/src/statuses.ts` — **Modify.** Change `StatusGroupKey` type, add a `statusGroup()` helper, rewrite `WORKFLOW_PHASES` groups to one-per-status. (`COURSE_STATUS_LABELS` is already defined earlier in this same file, line ~41, so it is in scope.)
- `packages/workflow/src/statuses.test.ts` — **Modify.** Add a `WORKFLOW_PHASES` describe block asserting coverage, one-status-per-group, label fidelity, and phase placement.
- `apps/web/app/(dashboard)/admin/page.tsx` — **Modify.** Replace the hardcoded `BOARD_COLUMNS` literal (lines ~65-75) with columns derived from `WORKFLOW_PHASES`. (It already imports `WORKFLOW_PHASES`.)

No new files. No other consumers: the old group keys (`"todo"`, `"shell_build"`, etc.) and the `StatusGroupKey` type are not referenced anywhere outside `statuses.ts` / its barrel export.

---

## Task 1: Rewrite `WORKFLOW_PHASES` to one group per status

**Files:**
- Modify: `packages/workflow/src/statuses.ts` (type `StatusGroupKey` ~line 81; `WORKFLOW_PHASES` ~lines 109-135)
- Test: `packages/workflow/src/statuses.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these imports to the top of `packages/workflow/src/statuses.test.ts` (extend the existing import block from `./statuses`):

```ts
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  INSTRUCTOR_ACTIONABLE_COURSE_STATUSES,
  STAFF_ACTIONABLE_COURSE_STATUSES,
  WORKFLOW_PHASES,
  getBallInCourt,
  getPipelineStage,
  getStaffAdvance,
  isInstructorActionableStatus,
  type CourseStatus,
} from "./statuses";
```

Append this describe block to the end of `packages/workflow/src/statuses.test.ts`:

```ts
describe("WORKFLOW_PHASES", () => {
  const allGroups = WORKFLOW_PHASES.flatMap((phase) =>
    phase.groups.map((group) => ({ phaseKey: phase.key, group })),
  );

  it("has exactly one group per course status, covering all statuses once", () => {
    const grouped = allGroups
      .flatMap(({ group }) => group.statuses)
      .sort();
    expect(grouped).toEqual([...COURSE_STATUSES].sort());
  });

  it("gives every group exactly one status", () => {
    for (const { group } of allGroups) {
      expect(group.statuses).toHaveLength(1);
    }
  });

  it("labels every group with its canonical status label", () => {
    for (const { group } of allGroups) {
      const status = group.statuses[0];
      expect(group.label).toBe(COURSE_STATUS_LABELS[status]);
    }
  });

  it("places every group under the status's pipeline phase", () => {
    for (const { phaseKey, group } of allGroups) {
      expect(phaseKey).toBe(getPipelineStage(group.statuses[0]));
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @coursebridge/workflow test`
Expected: FAIL — the "one status per group" and "label fidelity" tests fail because today's groups bundle multiple statuses (e.g. `shell_build` holds 2) and use invented labels ("Shell Build").

- [ ] **Step 3: Change the `StatusGroupKey` type**

In `packages/workflow/src/statuses.ts`, replace the `StatusGroupKey` union (currently the `"todo" | "in_review" | ...` type, ~lines 81-88) with:

```ts
/**
 * Group keys now map 1:1 to a course status — each dashboard column holds
 * exactly one status, labelled with its canonical {@link COURSE_STATUS_LABELS}.
 */
export type StatusGroupKey = CourseStatus
```

- [ ] **Step 4: Add the `statusGroup` helper and rewrite `WORKFLOW_PHASES`**

Replace the entire `WORKFLOW_PHASES` declaration (the `export const WORKFLOW_PHASES: WorkflowPhase[] = [ ... ]` block, ~lines 109-135) with the helper + new declaration below. Keep the existing `WorkflowPhase` / `WorkflowPhaseGroup` types and the `getPipelineStage` function unchanged.

```ts
/** One column = one status; label mirrors COURSE_STATUS_LABELS. */
function statusGroup(status: CourseStatus): WorkflowPhaseGroup {
  return { key: status, label: COURSE_STATUS_LABELS[status], statuses: [status] }
}

/**
 * Single source of truth for grouping the course statuses into the three
 * pipeline phases (Migration / Staging / Provision). Each status is its own
 * column, labelled with its canonical status label, so the column header, the
 * card badge, and the backend status all read identically. Both the staff
 * course-list view and the admin board derive their columns from this.
 */
export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    key: "migration",
    label: "Migration",
    groups: (["course_created", "assigned_to_ta", "ta_review_in_progress"] as CourseStatus[]).map(statusGroup),
  },
  {
    key: "staging",
    label: "Staging",
    groups: ([
      "submitted_to_admin",
      "admin_changes_requested",
      "waiting_on_admin",
      "staging_in_progress",
      "ready_for_instructor",
      "sent_to_instructor",
      "instructor_viewing",
      "instructor_questions",
      "instructor_approved",
    ] as CourseStatus[]).map(statusGroup),
  },
  {
    key: "provision",
    label: "Provision",
    groups: (["final_approved"] as CourseStatus[]).map(statusGroup),
  },
]
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @coursebridge/workflow test`
Expected: PASS — all four new `WORKFLOW_PHASES` tests green, and the existing `getBallInCourt` / `getStaffAdvance` / `isInstructorActionableStatus` tests still green.

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @coursebridge/workflow typecheck`
Expected: no errors (confirms `StatusGroupKey = CourseStatus` change compiles).

- [ ] **Step 7: Commit**

```bash
git add packages/workflow/src/statuses.ts packages/workflow/src/statuses.test.ts
git commit -m "feat(workflow): one column per status in WORKFLOW_PHASES, labels from COURSE_STATUS_LABELS"
```

---

## Task 2: Derive the admin board columns from `WORKFLOW_PHASES`

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/page.tsx` (the `BOARD_COLUMNS` literal, ~lines 65-75)

There is no unit test for this server-component page; verification is typecheck + a manual board check (Task 3). The change is a pure refactor — same `BoardColumn` shape, same downstream `boardColumns` mapping (lines ~82-99) untouched.

- [ ] **Step 1: Replace the hardcoded `BOARD_COLUMNS` array**

In `apps/web/app/(dashboard)/admin/page.tsx`, replace the whole `const BOARD_COLUMNS: ... = [ ... ]` literal (lines ~65-75, including the inline comments on lines 70-71) with:

```ts
  // One column per status, derived from the shared WORKFLOW_PHASES so the admin
  // board and the staff list always show identical columns/labels.
  const BOARD_COLUMNS: { key: string; label: string; phase: PipelineStage; statuses: CourseStatus[] }[] =
    WORKFLOW_PHASES.flatMap((phase) =>
      phase.groups.map((group) => ({
        key: group.key,
        label: group.label,
        phase: phase.key,
        statuses: group.statuses,
      })),
    )
```

Leave the `countByStatus` / `cardStatuses` / `boardColumns` code below it (lines ~76-99) exactly as is — it already consumes `BOARD_COLUMNS` generically.

- [ ] **Step 2: Typecheck the web app**

Run: `pnpm --filter web typecheck` (or, if that filter name differs, `pnpm -C apps/web typecheck`)
Expected: no errors. `group.key` is now a `CourseStatus` (a `string`, satisfies the `key: string` field); `group.statuses` is `CourseStatus[]`; `phase.key` is `PipelineStage`.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(dashboard)/admin/page.tsx"
git commit -m "refactor(admin): derive board columns from WORKFLOW_PHASES (unify with staff board)"
```

---

## Task 3: Verify both boards render identical, status-named columns

**Files:** none modified — verification only.

- [ ] **Step 1: Build / typecheck the whole repo**

Run: `pnpm typecheck` (root, runs across the turborepo) — or `pnpm -w build` if typecheck is not wired at root.
Expected: no errors across `packages/workflow` and `apps/web`.

- [ ] **Step 2: Manually verify the staff (TA) list view**

Start the dev server (`pnpm dev` or the project's documented run command) and open the TA/staff course list (`/ta` or `/courses`). Confirm:
- The Staging phase now shows sub-tab pills named exactly: **Submitted to Admin · Admin Changes Requested · Waiting on Admin · Staging in Process · Ready for Instructor · Sent to Instructor · Instructor Viewing · Instructor Questions · Instructor Approved** (they wrap; this is expected).
- Migration shows: **Course Created · Assigned to TA · TA Review In Progress**.
- No pill reads "Shell Build", "Ready to Send", "To Do", "In Review", "Admin Review", or "With Instructor".
- A card's status badge matches the pill it sits under.

- [ ] **Step 3: Manually verify the admin board**

Open the admin dashboard "All Courses" board (`/admin`). Confirm the kanban columns are the **same set and labels** as the staff pills above (one column per status, grouped under Migration / Staging / Provision), and each card's badge matches its column header.

- [ ] **Step 4: Final commit (if any verification tweaks were needed)**

If steps 2-3 surfaced no issues, nothing to commit. If a wrapping/layout tweak was required in `course-list-view.tsx`, commit it:

```bash
git add "apps/web/components/courses/course-list-view.tsx"
git commit -m "style(courses): adjust staging pill wrapping for per-status columns"
```

---

## Self-Review

**Spec coverage:**
- "Single source of truth — one group per status, label from `COURSE_STATUS_LABELS`" → Task 1.
- "TA list auto-follows" → Task 3 step 2 (no code change needed; verified).
- "Admin board refactored onto the same source" → Task 2.
- "Same across all roles" → Task 2 unifies the two column definitions; Task 3 verifies parity.
- "Wording stays (Staging in Process)" → labels are read from `COURSE_STATUS_LABELS`, which is untouched. ✓
- "Tests: coverage / one-per-group / label fidelity / phase placement" → Task 1 step 1, all four assertions present.
- Out-of-scope items (charts, `assigned-courses-table.tsx`, label rename) → not touched. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full code; test code is concrete.

**Type consistency:** `statusGroup` returns `WorkflowPhaseGroup`; `StatusGroupKey = CourseStatus` so `key: status` is valid; admin `BOARD_COLUMNS` keeps its declared shape `{ key: string; label: string; phase: PipelineStage; statuses: CourseStatus[] }`, and `WORKFLOW_PHASES.flatMap(... group => ...)` produces exactly that. Test imports match exported names (`WORKFLOW_PHASES`, `COURSE_STATUS_LABELS`, `getPipelineStage`).
