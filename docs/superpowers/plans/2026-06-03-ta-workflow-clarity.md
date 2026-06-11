# TA Workflow Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff one coherent, status-driven "advance to next step" action (with a confirmation modal and a preserved audit trail), unify all status text to the canonical backend labels, and add a separate "whose turn is it" indicator.

**Architecture:** Two new pure helpers in `@coursebridge/workflow` (`getBallInCourt`, `getStaffAdvance`) become the single source of truth for "whose turn" and "next staff move." The Step-5 Submit panel reads `getStaffAdvance(status)` to render one adaptive button gated by a confirmation dialog; the standalone staging banner is removed. A new `TurnIndicator` component renders ball-in-court from `getBallInCourt`. Status text everywhere derives from `getCourseStatusLabel`. No DB migration — the existing `transitionCourseStatus` path already writes both the `course_status_events` trail and the `audit_log` trigger row.

**Tech Stack:** TypeScript, Next.js App Router, React, Tailwind + shadcn/ui (`Dialog`), Vitest (newly added to the workflow package), npm workspaces.

**Spec:** `docs/superpowers/specs/2026-06-03-ta-workflow-clarity-design.md`

---

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `packages/workflow/src/statuses.ts` | Status list, labels, and now `BallInCourt` + `StaffAdvance` helpers | Modify |
| `packages/workflow/src/index.ts` | Public exports | Modify |
| `packages/workflow/src/statuses.test.ts` | Unit tests for the new helpers | Create |
| `packages/workflow/package.json` | Add vitest + `test` script | Modify |
| `apps/web/components/courses/turn-indicator.tsx` | Presentational ball-in-court badge | Create |
| `apps/web/app/(dashboard)/courses/[id]/_components/submit-panel.tsx` | Adaptive advance button + confirmation modal | Modify |
| `apps/web/app/(dashboard)/courses/[id]/_components/info-panel.tsx` | Remove staging banner | Modify |
| `apps/web/app/(dashboard)/courses/[id]/_components/staging-finalize-banner.tsx` | Logic moved into submit panel | Delete |
| `apps/web/components/providers/notification-provider.tsx` | Repoint staging notification deep-link | Modify |
| `apps/web/components/courses/course-table.tsx` | Replace bespoke `NextStepBadge` with `TurnIndicator` | Modify |
| `apps/web/components/courses/course-card.tsx` | Replace bespoke `owner` ("TA") with ball-in-court | Modify |

Not changed (verified during planning): `status-badge.tsx` already uses `getCourseStatusLabel`; `course-list-view.tsx` delegates per-course rendering to `CourseCard` and gets group labels from `WORKFLOW_PHASES`; the PDF/XLSX exporters' `"Submitted"` is a review-response status (different domain).

---

## Task 1: Workflow helpers + Vitest

**Files:**
- Modify: `packages/workflow/src/statuses.ts` (append after `getPipelineStage`)
- Modify: `packages/workflow/src/index.ts`
- Modify: `packages/workflow/package.json`
- Create: `packages/workflow/src/statuses.test.ts`

- [ ] **Step 1: Add vitest to the workflow package**

Run:
```bash
npm install -D vitest -w packages/workflow
```
Expected: installs `vitest` into `packages/workflow`'s devDependencies; updates `package-lock.json`.

- [ ] **Step 2: Add a `test` script**

In `packages/workflow/package.json`, change the `scripts` block to:
```json
  "scripts": {
    "build": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Write the failing test**

Create `packages/workflow/src/statuses.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  STAFF_ACTIONABLE_COURSE_STATUSES,
  getBallInCourt,
  getStaffAdvance,
  type CourseStatus,
} from "./statuses";

describe("getBallInCourt", () => {
  const expected: Record<CourseStatus, ReturnType<typeof getBallInCourt>> = {
    course_created: "admin",
    assigned_to_ta: "staff",
    ta_review_in_progress: "staff",
    submitted_to_admin: "admin",
    admin_changes_requested: "staff",
    waiting_on_admin: "admin",
    staging_in_progress: "staff",
    ready_for_instructor: "admin",
    sent_to_instructor: "instructor",
    instructor_viewing: "instructor",
    instructor_questions: "instructor",
    instructor_approved: "admin",
    final_approved: "done",
  };

  it.each(COURSE_STATUSES)("maps %s to its owner", (status) => {
    expect(getBallInCourt(status)).toBe(expected[status]);
  });
});

describe("getStaffAdvance", () => {
  it("returns Submit to Admin for in-progress review", () => {
    expect(getStaffAdvance("ta_review_in_progress")).toEqual({
      to: "submitted_to_admin",
      action: "submit",
      ctaLabel: "Submit to Admin",
    });
  });

  it("requires a note when resubmitting after changes", () => {
    expect(getStaffAdvance("admin_changes_requested")).toEqual({
      to: "submitted_to_admin",
      action: "submit",
      ctaLabel: "Resubmit to Admin",
      requiresNote: true,
    });
  });

  it("finalizes staging to ready_for_instructor", () => {
    expect(getStaffAdvance("staging_in_progress")).toEqual({
      to: "ready_for_instructor",
      action: "finalize-staging",
      ctaLabel: "Mark Ready for Instructor",
    });
  });

  it("returns null for non-staff-actionable statuses", () => {
    expect(getStaffAdvance("submitted_to_admin")).toBeNull();
    expect(getStaffAdvance("final_approved")).toBeNull();
  });

  it("is non-null for exactly STAFF_ACTIONABLE_COURSE_STATUSES", () => {
    const nonNull = COURSE_STATUSES.filter((s) => getStaffAdvance(s) !== null).sort();
    expect(nonNull).toEqual([...STAFF_ACTIONABLE_COURSE_STATUSES].sort());
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
npm run test -w packages/workflow
```
Expected: FAIL — `getBallInCourt`/`getStaffAdvance` are not exported.

- [ ] **Step 5: Implement the helpers**

In `packages/workflow/src/statuses.ts`, append at the end of the file:
```ts
/**
 * Whose court the case is in for a given status. The UI renders this relative
 * to the viewer (owner === me → "Your turn", else "Waiting on …").
 */
export type BallInCourt = "staff" | "admin" | "instructor" | "done";

const BALL_IN_COURT: Record<CourseStatus, BallInCourt> = {
  course_created: "admin",
  assigned_to_ta: "staff",
  ta_review_in_progress: "staff",
  submitted_to_admin: "admin",
  admin_changes_requested: "staff",
  waiting_on_admin: "admin",
  staging_in_progress: "staff",
  ready_for_instructor: "admin",
  sent_to_instructor: "instructor",
  instructor_viewing: "instructor",
  instructor_questions: "instructor",
  instructor_approved: "admin",
  final_approved: "done",
};

export function getBallInCourt(status: CourseStatus): BallInCourt {
  return BALL_IN_COURT[status];
}

/**
 * The single descriptor for the staff "advance to next step" action. Returns
 * null for any status where staff cannot advance the course. The non-null
 * domain is asserted (in tests) to equal STAFF_ACTIONABLE_COURSE_STATUSES.
 */
export type StaffAdvance = {
  to: CourseStatus;
  action: "submit" | "finalize-staging";
  ctaLabel: string;
  requiresNote?: boolean;
};

export function getStaffAdvance(status: CourseStatus): StaffAdvance | null {
  switch (status) {
    case "assigned_to_ta":
    case "ta_review_in_progress":
      return { to: "submitted_to_admin", action: "submit", ctaLabel: "Submit to Admin" };
    case "admin_changes_requested":
      return {
        to: "submitted_to_admin",
        action: "submit",
        ctaLabel: "Resubmit to Admin",
        requiresNote: true,
      };
    case "staging_in_progress":
      return {
        to: "ready_for_instructor",
        action: "finalize-staging",
        ctaLabel: "Mark Ready for Instructor",
      };
    default:
      return null;
  }
}
```

- [ ] **Step 6: Export the helpers**

In `packages/workflow/src/index.ts`, extend the `./statuses` export block to add the new names (keep alphabetical-ish grouping):
```ts
export {
  COURSE_STATUS_LABELS,
  COURSE_STATUSES,
  STAFF_ACTIONABLE_COURSE_STATUSES,
  getBallInCourt,
  getCourseStatusLabel,
  getPipelineStage,
  getStaffAdvance,
  isFinalStatus,
  isInstructorVisibleStatus,
  WORKFLOW_PHASES,
  type BallInCourt,
  type CourseStatus,
  type PipelineStage,
  type StaffAdvance,
  type StatusGroupKey,
  type WorkflowPhase,
  type WorkflowPhaseGroup
} from "./statuses";
```

- [ ] **Step 7: Run the test to verify it passes**

Run:
```bash
npm run test -w packages/workflow
```
Expected: PASS — all `getBallInCourt` and `getStaffAdvance` cases green.

- [ ] **Step 8: Commit**

```bash
git add packages/workflow/ package-lock.json
git commit -m "feat(workflow): add getBallInCourt + getStaffAdvance helpers with vitest"
```

---

## Task 2: TurnIndicator component

**Files:**
- Create: `apps/web/components/courses/turn-indicator.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/courses/turn-indicator.tsx`:
```tsx
import { getBallInCourt, type CourseStatus } from "@coursebridge/workflow"
import { cn } from "@/lib/utils"

interface TurnIndicatorProps {
  status: CourseStatus
  /** Whose perspective we render from. Defaults to staff (TA dashboards). */
  viewer?: "staff" | "admin" | "instructor"
  className?: string
}

/**
 * Ball-in-court signal, separate from the status label. Tells the viewer
 * whether it's their turn or whom they're waiting on. Minimal styling — final
 * appearance is refined via the Gemini visual pass.
 */
export function TurnIndicator({ status, viewer = "staff", className }: TurnIndicatorProps) {
  const owner = getBallInCourt(status)

  let label: string
  let dot: string
  if (owner === "done") {
    label = "Done"
    dot = "bg-emerald-500"
  } else if (owner === viewer) {
    label = "Your turn"
    dot = "bg-blue-500"
  } else if (owner === "admin") {
    label = "Waiting on Admin"
    dot = "bg-muted-foreground/50"
  } else if (owner === "instructor") {
    label = "Waiting on Instructor"
    dot = "bg-muted-foreground/50"
  } else {
    label = "Waiting on Staff"
    dot = "bg-muted-foreground/50"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("size-2 rounded-full", dot)} />
      <span className="text-xs font-semibold text-foreground/90">{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no new errors referencing `turn-indicator.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/courses/turn-indicator.tsx
git commit -m "feat(courses): add TurnIndicator ball-in-court component"
```

---

## Task 3: Adaptive Submit panel + confirmation modal

**Files:**
- Modify: `apps/web/app/(dashboard)/courses/[id]/_components/submit-panel.tsx`

This makes the single Submit button adapt to the current status, dispatch the
correct server action, and require explicit confirmation. Both `submitReview`
and `markStagingComplete` already route through `transitionCourseStatus`, so the
audit trail is preserved automatically — do not bypass them.

- [ ] **Step 1: Update imports**

In `submit-panel.tsx`, replace the import on line 5 and add the new ones. The
existing line:
```tsx
import type { CourseStatus } from "@coursebridge/workflow"
import { submitReview } from "@/lib/workspace/actions"
```
becomes:
```tsx
import { getCourseStatusLabel, getStaffAdvance, type CourseStatus } from "@coursebridge/workflow"
import { markStagingComplete, submitReview } from "@/lib/workspace/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
```

- [ ] **Step 2: Replace the derivation block + handler**

Replace the current block (lines 37–78, from `const [isPending, …` through the
end of `handleSubmit`) with:
```tsx
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resubmitNote, setResubmitNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const advance = getStaffAdvance(courseStatus)
  const isResubmit = Boolean(advance?.requiresNote)
  const isStatusSubmittable = advance !== null
  // Section requirements only gate the review-submit path, not staging finalize.
  const blockers =
    advance?.action === "submit" ? sections.filter((section) => section.required && !section.complete) : []
  const resubmitNoteRequired = isResubmit && resubmitNote.trim().length === 0
  const disabled = blockers.length > 0 || isPending || !isStatusSubmittable || isSuccess || resubmitNoteRequired

  useEffect(() => {
    if (!isSuccess) return
    const timeout = window.setTimeout(() => {
      window.location.href = "/ta"
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [isSuccess])

  const handleSubmit = () => {
    if (!advance) {
      const message = `Cannot advance from current status: ${courseStatus.replaceAll("_", " ")}.`
      setErrorMsg(message)
      toast.error(message)
      return
    }
    setConfirmOpen(true)
  }

  const runAdvance = () => {
    if (!advance) return
    setConfirmOpen(false)
    startTransition(async () => {
      setErrorMsg(null)
      const res =
        advance.action === "finalize-staging"
          ? await markStagingComplete(courseId)
          : await submitReview(courseId, isResubmit ? resubmitNote.trim() : undefined)
      if (!res?.ok) {
        const message = res?.error || "Failed to advance."
        setErrorMsg(message)
        toast.error(message)
        return
      }

      setIsSuccess(true)
      toast.success(`${advance.ctaLabel} — done.`)
    })
  }
```

- [ ] **Step 3: Update the status-mismatch notice copy**

Replace the `{!isStatusSubmittable && ( … )}` block (lines ~223–231) with copy
that points to the real action instead of saying it can't be submitted:
```tsx
                      {!isStatusSubmittable && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-500">
                          <AlertCircle className="mt-0.5 size-5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold">Nothing to do here right now</p>
                            <p className="text-xs font-medium opacity-90">This course is currently <span className="font-bold">{getCourseStatusLabel(courseStatus)}</span> — there is no staff action for this step.</p>
                          </div>
                        </div>
                      )}
```

- [ ] **Step 4: Make the button adaptive**

Replace the `<Button … >` block (lines ~245–269) with:
```tsx
                      <Button
                        disabled={disabled}
                        onClick={handleSubmit}
                        size="lg"
                        className={cn(
                          "h-14 min-w-[200px] rounded-2xl px-8 text-base font-black uppercase tracking-[0.15em] transition-all duration-500",
                          !disabled && isResubmit
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-1 active:scale-95"
                            : !disabled && "bg-gradient-to-r from-blue-600 to-violet-600 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:scale-95"
                        )}
                      >
                        {isPending ? (
                          "Working…"
                        ) : (
                          <>
                            {advance?.ctaLabel ?? "Submit Review"}
                            {isResubmit ? <RefreshCw className="ml-2 size-5" /> : <Send className="ml-2 size-5" />}
                          </>
                        )}
                      </Button>
```

- [ ] **Step 5: Add the confirmation dialog**

Immediately before the closing `</>` (the last two lines `    </>` / `  )`),
insert the dialog:
```tsx
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm this step</DialogTitle>
          <DialogDescription>
            {advance
              ? `This moves the course to "${getCourseStatusLabel(advance.to)}". You can't undo this from here.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={runAdvance}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
```

- [ ] **Step 6: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no errors in `submit-panel.tsx`.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(dashboard)/courses/[id]/_components/submit-panel.tsx"
git commit -m "feat(workspace): adaptive Submit action with confirmation modal"
```

---

## Task 4: Remove the staging finalize banner

**Files:**
- Modify: `apps/web/app/(dashboard)/courses/[id]/_components/info-panel.tsx`
- Delete: `apps/web/app/(dashboard)/courses/[id]/_components/staging-finalize-banner.tsx`

- [ ] **Step 1: Remove the import**

In `info-panel.tsx`, delete line 8:
```tsx
import { StagingFinalizeBanner } from "./staging-finalize-banner"
```

- [ ] **Step 2: Remove the render block**

In `info-panel.tsx`, delete the block at ~lines 101–103:
```tsx
            {courseStatus === "staging_in_progress" && (
              <StagingFinalizeBanner courseId={courseId} />
            )}
```

- [ ] **Step 3: Delete the banner file**

Run:
```bash
git rm "apps/web/app/(dashboard)/courses/[id]/_components/staging-finalize-banner.tsx"
```

- [ ] **Step 4: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no dangling references to `StagingFinalizeBanner`.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/courses/[id]/_components/info-panel.tsx"
git commit -m "refactor(workspace): remove staging banner; action now on Submit page"
```

---

## Task 5: Repoint the staging notification deep-link

**Files:**
- Modify: `apps/web/components/providers/notification-provider.tsx`

The `staging_in_progress` notification currently links to `/metadata`, where the
finalize control used to live in the sidebar. After Task 4 the action lives on
the Submit page, so the link must point there.

- [ ] **Step 1: Update the href**

In `notification-provider.tsx`, inside the `else if (toStatus === "staging_in_progress")` block (~line 444), change:
```tsx
                href: `/courses/${courseId}/metadata`,
```
to:
```tsx
                href: `/courses/${courseId}/submit`,
```
(Only within the `staging_in_progress` branch — leave the `waiting_on_admin`
branch's href unchanged.)

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/providers/notification-provider.tsx
git commit -m "fix(notifications): deep-link staging finalize to the Submit page"
```

---

## Task 6: Course table — replace NextStepBadge with TurnIndicator

**Files:**
- Modify: `apps/web/components/courses/course-table.tsx`

The Status column already uses the canonical `StatusBadge`. The "Next Step"
column's `NextStepBadge` mixes status with review progress into bespoke strings;
replace it with the ball-in-court `TurnIndicator`.

- [ ] **Step 1: Import TurnIndicator**

After the existing `import { StatusBadge } from "./status-badge"` line, add:
```tsx
import { TurnIndicator } from "./turn-indicator"
```

- [ ] **Step 2: Rename the column header**

Change the header cell text from `Next Step` to `Turn`:
```tsx
          <TableHead className="text-xs font-medium text-muted-foreground w-[140px]">Turn</TableHead>
```

- [ ] **Step 3: Swap the cell content**

Replace `<NextStepBadge course={course} />` with:
```tsx
              <TurnIndicator status={course.status} />
```

- [ ] **Step 4: Delete the NextStepBadge function**

Delete the entire `function NextStepBadge({ course }: { course: CourseRow }) { … }`
definition (the bespoke-string helper) and the now-unused `cn` import if nothing
else in the file uses it. (Check: if other code in the file still uses `cn`,
keep the import.)

- [ ] **Step 5: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no errors; `NextStepBadge` no longer referenced.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/courses/course-table.tsx
git commit -m "refactor(courses): table shows TurnIndicator instead of bespoke next-step strings"
```

---

## Task 7: Course card — ball-in-court instead of "TA" owner

**Files:**
- Modify: `apps/web/components/courses/course-card.tsx`

The card already shows the canonical status via `StatusBadge`. Replace the
bespoke `owner` ("TA"/"Admin") display and its style conditionals with the
ball-in-court helper. Keep `deriveNextAction` for the `action` hint and `tone`
accent, but drop its `owner` field.

- [ ] **Step 1: Update imports + derivation**

Change line 5 from:
```tsx
import { type CourseStatus } from "@coursebridge/workflow"
```
to:
```tsx
import { getBallInCourt, type CourseStatus } from "@coursebridge/workflow"
import { TurnIndicator } from "./turn-indicator"
```

Change line 31 from:
```tsx
  const { action, owner, tone } = deriveNextAction(course.status)
```
to:
```tsx
  const { action, tone } = deriveNextAction(course.status)
  const isStaffTurn = getBallInCourt(course.status) === "staff"
```

- [ ] **Step 2: Replace the owner display**

Replace the owner block (lines ~107–115) with the TurnIndicator:
```tsx
                <div className="ml-auto">
                  <TurnIndicator status={course.status} />
                </div>
```

- [ ] **Step 3: Replace the owner style conditional on the CTA button**

In the CTA `<Button>` (~line 149), change:
```tsx
                  owner === "TA"
                    ? "bg-black text-white hover:bg-zinc-800 shadow-sm hover:shadow"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-sm hover:shadow"
```
to:
```tsx
                  isStaffTurn
                    ? "bg-black text-white hover:bg-zinc-800 shadow-sm hover:shadow"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-sm hover:shadow"
```

- [ ] **Step 4: Drop the `owner` field from `deriveNextAction`**

Update the `deriveNextAction` signature and every `return` to remove `owner`.
The new signature:
```tsx
function deriveNextAction(status: CourseStatus): {
  action: string
  tone: "neutral" | "info" | "warning" | "success"
} {
```
And remove `owner: "…",` from each of the 12 `return { … }` statements plus the
`default` (e.g. `return { action: "Finalize course", tone: "info" }`). The
`owner` "TA"/"Admin" strings must no longer appear anywhere in the file.

- [ ] **Step 5: Typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no errors; no remaining references to `owner`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/courses/course-card.tsx
git commit -m "refactor(courses): card shows ball-in-court turn instead of bespoke TA owner"
```

---

## Final verification

- [ ] **Step 1: Full workflow tests**

Run:
```bash
npm run test -w packages/workflow
```
Expected: all PASS.

- [ ] **Step 2: Web typecheck**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
Expected: no errors.

- [ ] **Step 3: Manual smoke (reviewer)**

With the dev server running, as an assigned staff user on a `staging_in_progress`
course: open the Submit page, confirm the button reads "Mark Ready for
Instructor", click it, confirm the modal appears, confirm → course advances to
`ready_for_instructor`. Open the course Timeline and confirm a new status event
("TA finalized staging — ready for instructor.") is recorded.

---

## Gemini visual pass (handed to the user, not coded)

After the logic lands, the user refines appearance via a Gemini prompt for:
- `TurnIndicator` look (chip vs dot+text, color tokens per owner).
- The confirmation `Dialog` styling to match the workspace.
- The course-table "Turn" column and course-card turn placement.

The scaffolded minimal styling above is functional in the meantime.
