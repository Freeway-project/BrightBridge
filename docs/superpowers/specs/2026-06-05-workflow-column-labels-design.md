# Workflow Column Labels — One Column Per Status, Same Across Roles

Date: 2026-06-05
Status: Approved (pending spec review)

## Problem

The course board/list columns use invented bucket names that do not match the
backend status they hold, and the names differ by role:

- **TA / staff list** (`components/courses/course-list-view.tsx`) reads
  `WORKFLOW_PHASES[].groups[].label` → shows "To Do", "In Review",
  "Admin Review", **"Shell Build"**, **"Ready to Send"**, "With Instructor".
  Several of these bundle 2+ backend statuses under one made-up name
  (e.g. "Shell Build" = `waiting_on_admin` + `staging_in_progress`).
- **Admin board** (`app/(dashboard)/admin/page.tsx` `BOARD_COLUMNS`) keeps its
  **own separate** hardcoded column array — already more granular than the TA
  view (it splits "Waiting on Admin" and "Staging in Process"), but still
  bundles "Migration" (3 statuses), "Submitted to Admin" (2), and
  "With Instructor" (4).

Result: the same `courses.status` value appears under different column names
depending on the screen, and a card's status badge often disagrees with the
column header above it.

## Goal

Every workflow column header reads **exactly** like the backend status it
contains, and **all roles see the identical columns**. A column maps 1:1 to a
single `CourseStatus`, and its label is the canonical `COURSE_STATUS_LABELS`
text — the same string the status badge renders.

Decisions locked in brainstorming:
- **Option A** — one column per status (not renamed buckets, not badge-only).
- **All roles** unified onto a single source so they cannot drift again.
- **Wording stays as-is** — `staging_in_progress` keeps its current label
  "Staging in Process" (Process, not Progress). No global label rename in this
  change.

## Design

### Single source of truth — `WORKFLOW_PHASES`

In `packages/workflow/src/statuses.ts`, rewrite each phase's `groups` so there
is exactly one group per status, and the group `label` is pulled from
`COURSE_STATUS_LABELS` (not a literal string). The three phase buckets
(Migration / Staging / Provision) and `getPipelineStage` are unchanged — only
the sub-groups change.

Resulting groups (label = canonical status label):

| Phase | Groups (one status each, in order) |
|---|---|
| Migration | Course Created · Assigned to TA · TA Review In Progress |
| Staging | Submitted to Admin · Admin Changes Requested · Waiting on Admin · Staging in Process · Ready for Instructor · Sent to Instructor · Instructor Viewing · Instructor Questions · Instructor Approved |
| Provision | Final Approved |

- `StatusGroupKey` becomes one key per status. Simplest: set each group's `key`
  equal to its `CourseStatus` string, so `key`, `statuses[0]`, and the label
  source all line up. Update the `StatusGroupKey` type accordingly (or derive
  it from `CourseStatus`).
- Labels MUST come from `COURSE_STATUS_LABELS[status]` so column header === card
  badge === backend label, with no second copy to maintain.
- The invented labels ("To Do", "In Review", "Admin Review", "Shell Build",
  "Ready to Send", "With Instructor") are deleted.

### Consumer 1 — TA / staff list view (auto-follows)

`components/courses/course-list-view.tsx` already maps over `phase.groups` and
renders `group.label` + per-group counts. No logic change required; it simply
renders more sub-tab pills. The Staging phase now shows 9 pills — these already
render in a `flex-wrap` `TabsList`, so they wrap. Verify wrapping looks
acceptable; no new layout work expected.

### Consumer 2 — Admin board (refactor onto the same source)

`app/(dashboard)/admin/page.tsx`: delete the hardcoded `BOARD_COLUMNS` array and
build the board columns from `WORKFLOW_PHASES` groups instead, preserving the
existing `BoardColumn` shape (`key`, `label`, `phase`, `count`, `cards`). Each
group yields one column; `phase` is the parent phase key; counts/cards are
aggregated from that group's single status as today.

After this, the admin board and the TA list render the identical column set and
labels from one source — they cannot diverge again.

### Out of scope (note, do not change)

- `components/admin/stats/completion-funnel.tsx` and `status-pie.tsx` are charts,
  not workflow columns; they label by status already and are not part of this
  change.
- No change to `COURSE_STATUS_LABELS` text (the Process/Progress wording stays).
  A future rename, if wanted, is a separate task.
- No change to the transition graph, `getPipelineStage`, phase keys/labels, or
  the admin `assigned-courses-table.tsx` "Staging — …" hint vocabulary (that
  table is a different surface; can be aligned later if desired).

## Testing

`packages/workflow/src/statuses.test.ts` (extend):

1. **Coverage** — the set of all group `statuses` across `WORKFLOW_PHASES` equals
   `COURSE_STATUSES` exactly (every status appears once, none missing/duplicated).
2. **One status per group** — every group's `statuses` array has length 1.
3. **Label fidelity** — every group's `label === COURSE_STATUS_LABELS[group.statuses[0]]`.
4. **Phase placement** — each group's parent phase key === `getPipelineStage(status)`.

Manual check: load TA list and admin board, confirm identical column labels and
that each card's badge matches the column header it sits under.

## Risk / trade-off

- More columns (Staging shows 9). Accepted in brainstorming as the cost of exact
  1:1 naming. Many will be empty for a given TA; counts make that obvious.
- Admin kanban gains horizontal columns in Staging; existing board already
  scrolls, so no new mechanism needed.
