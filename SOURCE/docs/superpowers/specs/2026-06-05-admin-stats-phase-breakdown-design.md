# Admin Stats — Correct, Compact Phase Breakdown

Date: 2026-06-05
Status: Approved (pending spec review)

## Problem

The admin stats hardcode their own status groupings instead of deriving from the
canonical `WORKFLOW_PHASES`. They have drifted, producing **incorrect numbers**:

- **`instructor_viewing` is dropped** in multiple places:
  - `admin-overview.tsx` `STATUS_ORDER` (12 of 13 statuses) → courses in
    Instructor Viewing are **invisible** in the Status Breakdown.
  - `admin-overview.tsx` StatCard buckets: `withInstructor` = only
    `sent_to_instructor` + `instructor_questions`; `instructor_viewing` is in
    **no bucket**, so the 5 cards don't sum to Total.
  - `stage-pipeline.tsx` sort `order` + `STATUS_COLORS` omit `instructor_viewing`
    → its bar sorts to the wrong end and uses a fallback color.
- `status-pie.tsx` and `completion-funnel.tsx` use hand-written stage groupings
  (e.g. "Admin" = `waiting_on_admin`, `staging_in_progress`,
  `ready_for_instructor`) that match neither each other nor the canonical phases,
  and predate the new **Instructor** phase.

The user also wants more detail on *what is in what process*, in a compact
format, on the admin Overview.

## Goal

1. All admin stats derive from the canonical `WORKFLOW_PHASES` so counts are
   correct, include every status, and match the course board.
2. The Overview tab shows a compact per-phase → per-status breakdown.

No backend/query change — everything is computed from the existing
`statusCounts` (`StatusCount[]`) already fetched for these views.

## Design

### 1. Single source: `getPhaseBreakdown` (workflow package)

Add a pure helper in `packages/workflow/src/` (new file
`phase-breakdown.ts`, re-exported from `index.ts`):

```ts
export type StatusBreakdown = {
  status: CourseStatus
  label: string       // canonical COURSE_STATUS_LABELS
  shortLabel: string  // compact COURSE_STATUS_SHORT_LABELS (for dense displays)
  count: number
}

export type PhaseBreakdown = {
  key: PipelineStage
  label: string
  total: number
  statuses: StatusBreakdown[]
}

export function getPhaseBreakdown(
  countByStatus: Partial<Record<CourseStatus, number>>,
): PhaseBreakdown[]
```

It walks `WORKFLOW_PHASES`; for each phase, maps its groups' single statuses to
`{ status, label: COURSE_STATUS_LABELS[status], shortLabel: COURSE_STATUS_SHORT_LABELS[status], count: countByStatus[status] ?? 0 }`,
and sums `total`. Because it iterates `WORKFLOW_PHASES`, **every** status
(including `instructor_viewing`) is always present, in canonical order — the
drift bug cannot recur. Returns 4 phases: Migration · Staging · Instructor ·
Provision.

This is the single computation feeding the Overview breakdown, the pie, and the
funnel.

#### Short labels companion

Add `COURSE_STATUS_SHORT_LABELS: Record<CourseStatus, string>` in
`packages/workflow/src/statuses.ts`, directly beside `COURSE_STATUS_LABELS` (same
file = single home, not a competing vocabulary). These are contextual
abbreviations for dense displays where the phase header already supplies context:

| Status | Short label |
|---|---|
| course_created | Created |
| assigned_to_ta | Assigned |
| ta_review_in_progress | TA Review |
| submitted_to_admin | Submitted |
| admin_changes_requested | Changes |
| waiting_on_admin | Waiting |
| staging_in_progress | In Process |
| ready_for_instructor | Ready |
| sent_to_instructor | Sent |
| instructor_viewing | Viewing |
| instructor_questions | Questions |
| instructor_approved | Approved |
| final_approved | Final |

Re-exported from `index.ts`. The canonical `COURSE_STATUS_LABELS` is unchanged;
badges/columns/exports keep using it. Short labels are only for the compact
breakdown chips.

### 2. Shared phase colors (web)

Add `PHASE_COLOR: Record<PipelineStage, string>` (hex) in a small module
`apps/web/components/admin/stats/phase-colors.ts`:

```ts
export const PHASE_COLOR: Record<PipelineStage, string> = {
  migration:  "#64748b", // slate
  staging:    "#3b82f6", // blue
  instructor: "#f59e0b", // amber
  provision:  "#10b981", // emerald
}
```

Used by the charts so phase colors are consistent across pie/funnel/bar.

### 3. Overview tab (`admin-overview.tsx`)

- Top cards: keep only **Total Courses** and **Completed** (with % of total).
  Remove the `inProgress`, `pendingAdmin`, `withInstructor` hardcoded sums and
  their three cards.
- Remove the local `STATUS_ORDER` array and the plain "Status Breakdown" card.
- Render a new **`<PhaseBreakdown>`** component (see §4) from
  `getPhaseBreakdown(countByStatus)`.
- Keep the Staff Workload table unchanged.

`completed` = `countByStatus["final_approved"] ?? 0`; `completedPct` = round to
total. `countByStatus` is already built in this component.

### 4. New component `phase-breakdown.tsx` (web)

`apps/web/components/admin/stats/phase-breakdown.tsx`. Props:
`{ breakdown: PhaseBreakdown[] }`. Renders one row per phase:

- Phase header: phase label (uppercase) + a dot/accent in `PHASE_COLOR[key]` +
  the phase `total` (bold, tabular-nums).
- Below it, the phase's statuses as compact inline chips: `shortLabel count`,
  separated by `·` (e.g. `Created 2 · Assigned 5 · TA Review 8`). Zero-count
  statuses render dimmed (muted) so the row still reads as the full process,
  rather than being hidden.

Pure presentational; no data fetching. Uses `shortLabel` from the helper for the
chips.

### 5. `/admin/stats` fixes

- **`status-pie.tsx`**: replace the hand-written `SEGMENTS` grouping with the 4
  phases from `getPhaseBreakdown` (segment = phase, value = phase `total`, color
  = `PHASE_COLOR[key]`). `instructor_viewing` now included via the Instructor
  phase.
- **`completion-funnel.tsx`**: replace `FUNNEL_STAGES` with the 4 phases from
  `getPhaseBreakdown` (stage = phase, count = phase `total`, color =
  `PHASE_COLOR[key]`), preserving the existing bar/percent rendering.
- **`stage-pipeline.tsx`**: build the bar's status order from `WORKFLOW_PHASES`
  (flattened) so `instructor_viewing` is included and ordered correctly; color
  each bar by its phase via `getPipelineStage(status)` → `PHASE_COLOR`. Remove
  the hardcoded `STATUS_COLORS` map and the hardcoded `order` array.
- `stats-overview.tsx`: its `inProgressCount` (everything except
  `course_created` + `final_approved`) is a generic filter that already includes
  `instructor_viewing`; leave it unchanged (out of scope — no bug there).

## Testing

Workflow-package unit tests for `getPhaseBreakdown`
(`packages/workflow/src/phase-breakdown.test.ts`):

1. **Shape** — returns exactly 4 phases keyed migration, staging, instructor,
   provision, in that order.
2. **Full coverage** — flattening all phases' `statuses` yields every
   `CourseStatus` exactly once (explicitly assert `instructor_viewing` is
   present, in the instructor phase).
3. **Per-phase totals** — each phase `total` equals the sum of its statuses'
   counts.
4. **Grand total** — sum of phase totals equals the sum of the input map.
5. **Missing keys default to 0** — a status absent from `countByStatus` yields
   count 0 (not `undefined`/`NaN`).
6. **Labels** — each status has `label === COURSE_STATUS_LABELS[status]` and
   `shortLabel === COURSE_STATUS_SHORT_LABELS[status]`; `COURSE_STATUS_SHORT_LABELS`
   covers all 13 statuses (no missing key).

Manual check: Overview tab and `/admin/stats` render; seed a course in
`instructor_viewing` and confirm it appears (Instructor phase, count 1) and that
phase totals sum to Total Courses.

## Out of scope

- No change to the data source / queries (`getAdminOverviewData`,
  `statusCounts`).
- No change to `stats-overview.tsx`'s "In Progress" card (no bug).
- No change to the course board, `WORKFLOW_PHASES`, transitions, or the canonical
  `COURSE_STATUS_LABELS` text.
- The added `COURSE_STATUS_SHORT_LABELS` is display-only for compact stats; it
  does not replace `COURSE_STATUS_LABELS` anywhere else.

## Risk / trade-off

- Charts re-grouped from per-status to per-phase means the pie/funnel now show 4
  segments (matching the board) instead of their previous ad-hoc buckets. This
  is the intended consistency fix, but it is a visible change to those charts.
- `StagePipeline` remains per-status (one bar per status) — only its order and
  coloring change.
