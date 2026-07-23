# Bulk "Mark Provision Complete" on the Staging board

**Date:** 2026-07-23
**Branch:** `ft-bulk-provision-staging`

## Problem

Provisioning courses out of staging is done one course at a time. On the admin
courses **board → Staging tab**, a `super_admin` clicks each `staging_in_progress`
card's `Move → Final Approved` individually. When many courses are ready, this is
tedious. We want a bulk action: select several staging cards and mark them all
provision-complete at once.

## Terminology (important)

There is **no status literally named `provisioned`**. The terminal status is
`final_approved`; the pipeline **phase** that contains it is named `provision`.
The single-course action is **"Mark Provision Complete"**, the transition
`staging_in_progress → final_approved`
(`packages/workflow/src/transitions.ts:68`), allowed for roles
**`standard_user` and `super_admin` only** — not `admin_full`.

## Scope

Bulk-apply the existing `staging_in_progress → final_approved` transition to a
multi-selection on the board. In scope: server action, board button, eligibility
gating, a pure eligibility helper + tests. **Out of scope:** letting `admin_full`
provision (would require the admin-override path with a mandatory reason — a
separate feature), and any new screen.

## Design

### 1. Eligibility rule (pure, tested)

New helper in `packages/workflow/src/transitions.ts`, re-exported from the package
index:

```ts
export function canProvisionComplete(role: EffectiveRole, from: CourseStatus): boolean {
  return from === "staging_in_progress"
    && canTransition({ role, from: "staging_in_progress", to: "final_approved" });
}
```

A card is bulk-provisionable iff its status is `staging_in_progress` **and** the
operator's role permits the transition. For `admin_full` this is always `false`,
so the button never appears for them — consistent with them being unable to do
the move single-course today. This is the single source of truth shared by the
board (button visibility + eligible subset) and re-verified server-side by
`transitionCourseStatus`.

Unit-tested in `transitions.test.ts` (mirrors the `isAdminOverride` test style):
`staging_in_progress` + `super_admin`/`standard_user` → true; any other status →
false; `admin_full`/`instructor`/`admin_viewer` on `staging_in_progress` → false.

### 2. Server action

New `batchProvisionCompleteAction(courseIds: string[])` in
`apps/web/app/(dashboard)/admin/actions.ts`, modeled verbatim on the existing
`batchApproveToStagingAction` (actions.ts:556):

```ts
export async function batchProvisionCompleteAction(
  courseIds: string[],
): Promise<{ succeeded: number; failed: number }> {
  const ctx = await requireProfile();
  requireAnyRole(ctx, ["standard_user", "super_admin"]); // exact edge roles
  let succeeded = 0, failed = 0;
  for (const courseId of courseIds) {
    try {
      await transitionCourseStatus({
        courseId,
        toStatus: "final_approved",
        note: "Bulk marked provision complete.",
      });
      succeeded++;
    } catch {
      failed++;
    }
  }
  revalidatePath("/admin");
  revalidatePath("/ta");
  return { succeeded, failed };
}
```

`transitionCourseStatus` self-enforces the transition graph (`assertCanTransition`)
**and** per-course access (`assertCanActOnCourse`), and writes both the
`courses.status` UPDATE and the `course_status_events` audit row — so no raw SQL
and no trusting the client. Any course not actually in `staging_in_progress`
throws and is counted as `failed`, not silently applied. Not individually
unit-tested — consistent with its untested sibling batch actions; the risk lives
in the shared `transitionCourseStatus`, which is tested elsewhere.

### 3. Board UI

In `apps/web/app/(dashboard)/admin/_components/courses-board.tsx`:

- Track `status` alongside `id`/`title` in the selection. The existing
  `reassignTargets: {id,title}[]` becomes `selectedCards: {id,title,status}[]`
  (structurally still a valid `ReassignTarget[]` for the reassign dialog).
  `toggleSelection` and the card callback thread `card.status`.
- Compute the eligible subset:
  `const eligibleForProvision = selectedCards.filter(c => canProvisionComplete(role, c.status))`.
- In the existing sticky selection bar (board view only), next to "Reassign
  selected", render **"Mark Provision Complete (N)"** only when
  `eligibleForProvision.length > 0` (N = eligible count). Click →
  `window.confirm(...)` (an accepted convention here) → call the action with only
  the eligible ids → remove those ids from the selection → `router.refresh()`.
  On partial failure, show an inline count.

**"Only eligible" nuance:** the board's checkboxes are shared with "Reassign
selected" (which works on any status), so we can't literally disable non-eligible
checkboxes without breaking reassign. Instead we honor "no failures" at the action
layer: the provision button acts only on the eligible subset and shows its count;
non-eligible selected cards are untouched and remain available for reassign.

## Permissions decision (resolved)

Building the `super_admin`/`standard_user` path that mirrors who can provision
today. `admin_full` bulk-provisioning (override path) is explicitly out of scope.

## Testing / verification

- `pnpm --filter @coursebridge/workflow test` (or repo `vitest run`) — new
  `canProvisionComplete` tests pass.
- Full `vitest run` stays green.
- `tsc` / typecheck clean.
- Manual: board Staging tab, select multiple `staging_in_progress` cards → button
  shows correct count → confirm → cards move to the Provision phase.
