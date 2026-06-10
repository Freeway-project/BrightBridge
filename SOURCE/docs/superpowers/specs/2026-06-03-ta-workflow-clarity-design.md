# TA Workflow Clarity — Design

**Date:** 2026-06-03
**Status:** Proposed (awaiting spec review)
**Branch:** fix-workflow

## Problem

The staff/TA experience encodes the same idea — "finish my part, push the case
to the next step" — in inconsistent ways, which reads to users as a status
mismatch:

1. **Two differently-named advance controls in two places.** The review submit
   lives on the Step-5 *Submit* page (`submitReview` →
   `ta_review_in_progress → submitted_to_admin`). The staging finalize lives in
   a sidebar banner (`markStagingComplete` →
   `staging_in_progress → ready_for_instructor`). A TA who learns "Submit =
   advance" hits a dead end at `staging_in_progress`: the Submit page is
   *disabled* and the real action is a differently-named banner elsewhere.
2. **Bespoke per-screen labels** (`"Ready to Submit"`, `"Finalize Staging"`,
   `"Waiting on Admin"`, `"TA"`) that don't match the canonical backend status
   names, making the UI hard to correlate with Postgres / `statuses.ts`.
3. **No single, at-a-glance "whose turn is it"** signal — actionability is
   inferred from ad-hoc badge strings.

This is not a schema or transition-graph bug. The backend flow
(`packages/workflow/src/transitions.ts`) is correct and already allows
`staging_in_progress → ready_for_instructor` for `standard_user`. The issue is
UI consistency and naming.

## Goals

- One coherent "advance to the next step" action for staff, regardless of phase.
- UI status text derived from one canonical source of truth.
- A separate, explicit "ball-in-court" signal (your turn vs waiting).
- A confirmation step so transitions can't happen by accident.
- Every advance continues to produce a full audit trail.

## Non-goals

- No change to the transition graph, statuses, or any DB migration.
- No change to admin / instructor / comms flows beyond what naming consistency
  requires.
- Pure visual styling is **not** coded here — it is delivered as a Gemini prompt
  (per standing workspace preference). Components are scaffolded with minimal
  functional styling so they work; appearance is refined via the prompt.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Naming model | **Canonical human label only** — everything reads `getCourseStatusLabel(status)`; kill bespoke strings. |
| Status vs turn | **Two separate signals** — canonical status label + a separate per-row turn indicator. |
| Submit placement | **Adaptive Step-5 Submit page** — one control that changes by status; sidebar banner removed. |
| Build split | I code the logic/wiring; **Gemini prompt** for pure visual styling. |
| Confirmation | **Modal confirmation** before any advance. |
| Tests | Add `vitest` to `packages/workflow` for the new pure helpers. |

---

## Architecture

### A. Workflow package — single source of truth (pure logic)

New, pure, dependency-free functions in `packages/workflow/src`, exported from
`index.ts`. These become the only place that encodes "whose turn" and "what is
the next staff move."

```ts
// Whose court the case is in for a given status.
export type BallInCourt = "staff" | "admin" | "instructor" | "done"

export function getBallInCourt(status: CourseStatus): BallInCourt
//  staff:      assigned_to_ta, ta_review_in_progress, admin_changes_requested,
//              staging_in_progress
//  admin:      course_created, submitted_to_admin, waiting_on_admin,
//              ready_for_instructor, instructor_approved
//  instructor: sent_to_instructor, instructor_viewing, instructor_questions
//  done:       final_approved

// The single descriptor for the staff "advance to next step" action.
export type StaffAdvance = {
  to: CourseStatus              // target status
  action: "submit" | "finalize-staging"  // which server action to call
  ctaLabel: string             // button copy, anchored to the canonical target
  requiresNote?: boolean       // resubmit-after-changes needs a "what I fixed" note
}

export function getStaffAdvance(status: CourseStatus): StaffAdvance | null
//  assigned_to_ta          -> { to: submitted_to_admin,  action: submit,           ctaLabel: "Submit to Admin" }
//  ta_review_in_progress   -> { to: submitted_to_admin,  action: submit,           ctaLabel: "Submit to Admin" }
//  admin_changes_requested -> { to: submitted_to_admin,  action: submit,           ctaLabel: "Resubmit to Admin", requiresNote: true }
//  staging_in_progress     -> { to: ready_for_instructor, action: finalize-staging, ctaLabel: "Mark Ready for Instructor" }
//  (any other status)      -> null
```

`getBallInCourt` returns the *canonical owner*; the UI renders it relative to the
viewer (owner === me → "Your turn", else "Waiting on {Admin|Instructor}").

The `STAFF_ACTIONABLE_COURSE_STATUSES` constant in `statuses.ts` already lists
exactly the four staff-actionable statuses; `getStaffAdvance` returns non-null
for precisely those, and a unit test asserts the two stay in sync.

### B. Naming — canonical labels everywhere (logic)

Replace every bespoke status string with `getCourseStatusLabel(status)`:

- `components/courses/course-table.tsx` — `NextStepBadge` (sole consumer) is
  split into a canonical status label + the new turn indicator.
- `components/courses/course-card.tsx` — status label logic.
- `components/courses/course-list-view.tsx` — status label logic.
- `components/courses/status-badge.tsx` — ensure text comes from the canonical
  label.

Status **colors** stay (visual, keyed by status in `lib/constants/status.ts`);
only the **text** is unified.

**Explicitly out of scope:** the `"Submitted"` strings in the PDF/XLSX exporters
(`app/print/...`, `app/api/courses/[id]/xlsx/route.ts`,
`app/api/super-admin/courses/export/route.ts`) describe a *review-section
response* status (`draft`/`submitted`), not a course workflow status. Different
domain — left untouched.

### C. Adaptive unified Submit + confirmation modal (logic + scaffolded UI)

`app/(dashboard)/courses/[id]/_components/submit-panel.tsx` becomes status-driven
via `getStaffAdvance(courseStatus)`:

- If `getStaffAdvance` returns null → the panel shows the existing
  "can't submit from here" message (a course in a non-staff-actionable status).
- CTA label comes from `staffAdvance.ctaLabel`.
- Action dispatch: `action === "submit"` → `submitReview`;
  `action === "finalize-staging"` → `markStagingComplete`.
- Preconditions preserved: required sections complete (submit path);
  `requiresNote` → the resubmit note is mandatory.
- **Confirmation modal** gates every advance: "You're about to move this course
  to **{canonical target label}**. Continue?" Only on confirm does the action
  run. This is the no-accidents guard.
- The Submit page already renders for any status the user can access
  (`submit/page.tsx` has no status guard), so no routing change is needed for
  `staging_in_progress` to reach the adaptive control.

The sidebar `StagingFinalizeBanner` is **removed**: delete the import and usage
in `info-panel.tsx` (lines 8 and ~102) and delete
`staging-finalize-banner.tsx`. Its logic now lives in the one adaptive control.

### D. Ball-in-court indicator (scaffolded UI)

New `components/courses/turn-indicator.tsx` — a small presentational component
that takes `status` (and the viewer's perspective) and renders, via
`getBallInCourt`, one of: *Your turn* / *Waiting on Admin* /
*Waiting on Instructor* / *Done*. Rendered next to the canonical status label on
staff course rows/cards. Scaffolded with minimal styling; final look comes from
the Gemini prompt.

---

## Audit Trail (the "it should have a trail" requirement)

The trail already exists and is robust; the design's job is to **ride it, not
bypass it**:

- `transitionCourseStatus` (`lib/courses/service.ts:158`) updates the status,
  then writes a `course_status_events` row carrying the **actor and the note** —
  this is the canonical status trail and feeds the Timeline.
- The `courses` table's `audit_capture` trigger (migration
  `20260603120000_audit_log.sql`) additionally records every status UPDATE in
  the generic `audit_log`. The Timeline unions both and prefers
  `course_status_events` for status rows.

Both staff actions already route through `transitionCourseStatus`
(`markStagingComplete` calls it directly; `submitReview` calls it for each hop).

**Requirement made explicit:** the adaptive control must keep calling the
existing server actions (never write `courses.status` directly), and every
branch must pass a meaningful, distinct `note`:

| From → To | Note |
| --- | --- |
| `ta_review_in_progress → submitted_to_admin` | "TA submitted review" (or the optional submit note) |
| `admin_changes_requested → … → submitted_to_admin` | the required resubmit note ("what I fixed") |
| `staging_in_progress → ready_for_instructor` | "TA finalized staging — ready for instructor." |

Net effect: the trail is unchanged in mechanism and *improved* in that each
distinct advance carries its own descriptive note.

---

## Compatibility & Conflict Analysis

### Conflicts with existing code (must be handled in this change)

1. **Notification deep-link (real conflict).**
   `components/providers/notification-provider.tsx` (~line 444): the
   `staging_in_progress` notification ("Ready to Finalize" / action
   "Finalize & Send") links to `/courses/{id}/metadata` because the finalize
   banner used to be visible in the sidebar there. After removing the banner,
   that page has no finalize control. **Fix:** repoint this notification's
   `href` to `/courses/{id}/submit`. (The `waiting_on_admin` notification is
   purely informational and is left as-is.)

2. **`info-panel.tsx` banner removal.** Remove the import (line 8) and the
   `courseStatus === "staging_in_progress"` render block (~line 102). No other
   consumer of `StagingFinalizeBanner` exists.

3. **`NextStepBadge`** is consumed only in `course-table.tsx`, so the split is
   localized.

4. **Workspace nav copy (minor, optional).** The Step-5 nav item is labeled
   "Submit / Final review". When the course is in `staging_in_progress` the step
   hosts "Mark Ready for Instructor". Adapting that sub-label is optional polish
   and can be part of the Gemini visual pass; not required for correctness.

### No conflict (verified)

- **No DB migration** is introduced — the helpers are TypeScript and the trail
  already exists. Zero risk of migration ordering/constraint conflicts with
  future branches.
- The `audit_capture` trigger fires on any `courses` UPDATE; this change does
  not alter how status is written, so audit coverage is unaffected.
- Recent work (generic `audit_log`, Timeline that surfaces it) is *fed*
  correctly because we continue to go through `transitionCourseStatus` with
  notes.

### Future-proofing

- Because "whose turn" and "next staff move" are centralized in
  `getBallInCourt` / `getStaffAdvance`, adding a future status requires editing
  one place, and the in-sync unit test will fail loudly if
  `STAFF_ACTIONABLE_COURSE_STATUSES` and `getStaffAdvance` diverge.

---

## Testing

The repo currently has **no test runner** (the workflow package only runs
`tsc --noEmit`). Since section A is pure logic, add **`vitest`** to
`packages/workflow` and unit-test:

- `getBallInCourt` — one assertion per status (table-driven), covering all 13.
- `getStaffAdvance` — correct descriptor for each staff-actionable status and
  `null` for the rest; and a test asserting its non-null domain equals
  `STAFF_ACTIONABLE_COURSE_STATUSES`.

App-layer (submit-panel, notifications) changes are verified manually / via the
existing type-check; no app test harness is introduced in this scope.

---

## Deliverables

1. **Code (by Claude):** sections A–D structure + wiring, the conflict fixes,
   and the workflow-package unit tests.
2. **Gemini prompt (for the user):** visual styling for the status badge +
   `TurnIndicator`, the confirmation modal, and the dashboard row layout.

## Files Touched

- `packages/workflow/src/statuses.ts` (or a new `ball-in-court.ts`) — helpers.
- `packages/workflow/src/index.ts` — exports.
- `packages/workflow/package.json` + test files — vitest + unit tests.
- `apps/web/app/(dashboard)/courses/[id]/_components/submit-panel.tsx` — adaptive
  control + confirmation modal.
- `apps/web/app/(dashboard)/courses/[id]/_components/info-panel.tsx` — remove
  banner.
- `apps/web/app/(dashboard)/courses/[id]/_components/staging-finalize-banner.tsx`
  — deleted.
- `apps/web/components/providers/notification-provider.tsx` — repoint staging
  notification href.
- `apps/web/components/courses/course-table.tsx` — split NextStepBadge.
- `apps/web/components/courses/course-card.tsx` — canonical labels.
- `apps/web/components/courses/course-list-view.tsx` — canonical labels.
- `apps/web/components/courses/status-badge.tsx` — canonical label text.
- `apps/web/components/courses/turn-indicator.tsx` — new (scaffolded).
