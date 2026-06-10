# Admin Stats Phase Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all admin stats derive from `WORKFLOW_PHASES` (fixing the dropped-`instructor_viewing` miscount) and show a compact per-phase → per-status breakdown on the Overview tab.

**Architecture:** Add one pure helper `getPhaseBreakdown(countByStatus)` in the workflow package (single source, includes every status by construction). A new presentational `<PhaseBreakdown>` component renders the compact phase rows on the Overview tab. The `/admin/stats` pie/funnel/bar are re-based on the same helper / `WORKFLOW_PHASES` order. No backend/query change — all driven off the existing `statusCounts`.

**Tech Stack:** TypeScript, Vitest (workflow package), Next.js App Router + Recharts (web).

**Spec:** `docs/superpowers/specs/2026-06-05-admin-stats-phase-breakdown-design.md`

---

## File Structure

- `packages/workflow/src/statuses.ts` — **Modify.** Add `COURSE_STATUS_SHORT_LABELS` beside `COURSE_STATUS_LABELS`.
- `packages/workflow/src/phase-breakdown.ts` — **Create.** `getPhaseBreakdown` + `PhaseBreakdown`/`StatusBreakdown` types.
- `packages/workflow/src/phase-breakdown.test.ts` — **Create.** Unit tests for the helper.
- `packages/workflow/src/index.ts` — **Modify.** Re-export the new symbols.
- `apps/web/components/admin/stats/phase-colors.ts` — **Create.** `PHASE_COLOR` hex map.
- `apps/web/components/admin/stats/phase-breakdown.tsx` — **Create.** Compact phase-rows component.
- `apps/web/app/(dashboard)/admin/_components/admin-overview.tsx` — **Modify.** Trim top cards to Total + Completed; replace Status Breakdown with `<PhaseBreakdown>`.
- `apps/web/components/admin/stats/status-pie.tsx` — **Modify.** Segments from `getPhaseBreakdown`.
- `apps/web/components/admin/stats/completion-funnel.tsx` — **Modify.** Stages from `getPhaseBreakdown`.
- `apps/web/components/admin/stats/stage-pipeline.tsx` — **Modify.** Order from `WORKFLOW_PHASES`, color by phase.

`StatusCount` is `{ status: CourseStatus; count: number }` (`apps/web/lib/repositories/contracts.ts:109`). Web components build `countByStatus` via the existing pattern `Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))`.

---

## Task 1: `getPhaseBreakdown` helper + short labels (workflow package)

**Files:**
- Modify: `packages/workflow/src/statuses.ts`
- Create: `packages/workflow/src/phase-breakdown.ts`
- Create: `packages/workflow/src/phase-breakdown.test.ts`
- Modify: `packages/workflow/src/index.ts`

- [ ] **Step 1: Add `COURSE_STATUS_SHORT_LABELS` to `statuses.ts`**

In `packages/workflow/src/statuses.ts`, directly AFTER the existing `COURSE_STATUS_LABELS` object (it ends around line 55 with `final_approved: "Final Approved" };`), add:

```ts
/**
 * Abbreviated status labels for dense displays (e.g. the admin phase breakdown),
 * where the phase header already supplies context. Display-only — the canonical
 * names remain COURSE_STATUS_LABELS.
 */
export const COURSE_STATUS_SHORT_LABELS: Record<CourseStatus, string> = {
  course_created: "Created",
  assigned_to_ta: "Assigned",
  ta_review_in_progress: "TA Review",
  submitted_to_admin: "Submitted",
  admin_changes_requested: "Changes",
  waiting_on_admin: "Waiting",
  staging_in_progress: "In Process",
  ready_for_instructor: "Ready",
  sent_to_instructor: "Sent",
  instructor_viewing: "Viewing",
  instructor_questions: "Questions",
  instructor_approved: "Approved",
  final_approved: "Final"
};
```

- [ ] **Step 2: Write the failing test**

Create `packages/workflow/src/phase-breakdown.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  COURSE_STATUS_LABELS,
  COURSE_STATUS_SHORT_LABELS,
  type CourseStatus,
} from "./statuses";
import { getPhaseBreakdown } from "./phase-breakdown";

describe("getPhaseBreakdown", () => {
  it("returns the four pipeline phases in order", () => {
    const b = getPhaseBreakdown({});
    expect(b.map((p) => p.key)).toEqual(["migration", "staging", "instructor", "provision"]);
  });

  it("covers every course status exactly once, incl. instructor_viewing", () => {
    const b = getPhaseBreakdown({});
    const all = b.flatMap((p) => p.statuses.map((s) => s.status)).sort();
    expect(all).toEqual([...COURSE_STATUSES].sort());
    const instructor = b.find((p) => p.key === "instructor")!;
    expect(instructor.statuses.map((s) => s.status)).toContain("instructor_viewing");
  });

  it("computes per-phase totals as the sum of their statuses", () => {
    const counts: Partial<Record<CourseStatus, number>> = {
      course_created: 2, assigned_to_ta: 5, ta_review_in_progress: 8,
      instructor_viewing: 1, final_approved: 12,
    };
    const b = getPhaseBreakdown(counts);
    expect(b.find((p) => p.key === "migration")!.total).toBe(15);
    for (const p of b) {
      expect(p.total).toBe(p.statuses.reduce((sum, s) => sum + s.count, 0));
    }
  });

  it("grand total equals the sum of the input counts", () => {
    const counts: Partial<Record<CourseStatus, number>> = {
      course_created: 2, staging_in_progress: 4, instructor_viewing: 1, final_approved: 12,
    };
    const grand = getPhaseBreakdown(counts).reduce((sum, p) => sum + p.total, 0);
    expect(grand).toBe(19);
  });

  it("defaults missing statuses to 0 (never undefined/NaN)", () => {
    const b = getPhaseBreakdown({ course_created: 3 });
    for (const p of b) {
      for (const s of p.statuses) {
        expect(typeof s.count).toBe("number");
        expect(Number.isNaN(s.count)).toBe(false);
      }
    }
    const migration = b.find((p) => p.key === "migration")!;
    expect(migration.statuses.find((s) => s.status === "course_created")!.count).toBe(3);
    expect(migration.statuses.find((s) => s.status === "assigned_to_ta")!.count).toBe(0);
  });

  it("labels each status with canonical + short labels", () => {
    const b = getPhaseBreakdown({});
    for (const p of b) {
      for (const s of p.statuses) {
        expect(s.label).toBe(COURSE_STATUS_LABELS[s.status]);
        expect(s.shortLabel).toBe(COURSE_STATUS_SHORT_LABELS[s.status]);
      }
    }
    for (const status of COURSE_STATUSES) {
      expect(COURSE_STATUS_SHORT_LABELS[status]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm -C packages/workflow test`
Expected: FAIL — `phase-breakdown.ts` / `getPhaseBreakdown` does not exist yet (import error).

- [ ] **Step 4: Implement the helper**

Create `packages/workflow/src/phase-breakdown.ts`:

```ts
import {
  COURSE_STATUS_LABELS,
  COURSE_STATUS_SHORT_LABELS,
  WORKFLOW_PHASES,
  type CourseStatus,
  type PipelineStage,
} from "./statuses";

export type StatusBreakdown = {
  status: CourseStatus;
  label: string;
  shortLabel: string;
  count: number;
};

export type PhaseBreakdown = {
  key: PipelineStage;
  label: string;
  total: number;
  statuses: StatusBreakdown[];
};

/**
 * Buckets per-status counts into the canonical WORKFLOW_PHASES (one entry per
 * status, every status present — so no status is ever dropped from the totals).
 */
export function getPhaseBreakdown(
  countByStatus: Partial<Record<CourseStatus, number>>,
): PhaseBreakdown[] {
  return WORKFLOW_PHASES.map((phase) => {
    const statuses: StatusBreakdown[] = phase.groups.map((group) => {
      const status = group.statuses[0];
      return {
        status,
        label: COURSE_STATUS_LABELS[status],
        shortLabel: COURSE_STATUS_SHORT_LABELS[status],
        count: countByStatus[status] ?? 0,
      };
    });
    return {
      key: phase.key,
      label: phase.label,
      total: statuses.reduce((sum, s) => sum + s.count, 0),
      statuses,
    };
  });
}
```

- [ ] **Step 5: Re-export from `index.ts`**

In `packages/workflow/src/index.ts`: (a) add `COURSE_STATUS_SHORT_LABELS,` to the existing `export { ... } from "./statuses";` block (alongside `COURSE_STATUS_LABELS`). (b) Add a new export block at the end of the file:

```ts
export {
  getPhaseBreakdown,
  type PhaseBreakdown,
  type StatusBreakdown
} from "./phase-breakdown";
```

- [ ] **Step 6: Run tests + typecheck to verify they pass**

Run: `pnpm -C packages/workflow test`
Expected: PASS — all 6 `getPhaseBreakdown` tests green; existing `WORKFLOW_PHASES` / `getPipelineStage` tests still green.

Run: `pnpm -C packages/workflow typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/workflow/src/statuses.ts packages/workflow/src/phase-breakdown.ts packages/workflow/src/phase-breakdown.test.ts packages/workflow/src/index.ts
git commit -m "feat(workflow): getPhaseBreakdown helper + short status labels"
```

---

## Task 2: PhaseBreakdown component + Overview tab rewrite

**Files:**
- Create: `apps/web/components/admin/stats/phase-colors.ts`
- Create: `apps/web/components/admin/stats/phase-breakdown.tsx`
- Modify: `apps/web/app/(dashboard)/admin/_components/admin-overview.tsx`

No unit test (presentational server/client components); verification is web typecheck + manual.

- [ ] **Step 1: Create the shared phase color map**

Create `apps/web/components/admin/stats/phase-colors.ts`:

```ts
import type { PipelineStage } from "@coursebridge/workflow"

/** Hex colors per pipeline phase, shared by the admin stat charts/breakdown. */
export const PHASE_COLOR: Record<PipelineStage, string> = {
  migration:  "#64748b", // slate
  staging:    "#3b82f6", // blue
  instructor: "#f59e0b", // amber
  provision:  "#10b981", // emerald
}
```

- [ ] **Step 2: Create the `PhaseBreakdown` component**

Create `apps/web/components/admin/stats/phase-breakdown.tsx`:

```tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PhaseBreakdown as PhaseBreakdownData } from "@coursebridge/workflow"
import { PHASE_COLOR } from "./phase-colors"

export function PhaseBreakdown({ breakdown }: { breakdown: PhaseBreakdownData[] }) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {breakdown.map((phase) => (
          <div key={phase.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: PHASE_COLOR[phase.key] }} />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">{phase.label}</span>
              <span className="ml-auto text-sm font-black tabular-nums text-foreground">{phase.total}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-xs">
              {phase.statuses.map((s, i) => (
                <span key={s.status} className="flex items-center gap-1">
                  <span className={cn(s.count === 0 ? "text-muted-foreground/40" : "text-muted-foreground")}>
                    {s.shortLabel}
                  </span>
                  <span className={cn("font-bold tabular-nums", s.count === 0 ? "text-muted-foreground/40" : "text-foreground")}>
                    {s.count}
                  </span>
                  {i < phase.statuses.length - 1 && <span className="text-muted-foreground/30">·</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Rewrite `admin-overview.tsx`**

Replace the entire contents of `apps/web/app/(dashboard)/admin/_components/admin-overview.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/shared/stat-card"
import { PhaseBreakdown } from "@/components/admin/stats/phase-breakdown"
import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import type { AdminOverviewData } from "@/lib/admin/queries"

export function AdminOverview({ data }: { data: AdminOverviewData }) {
  const { totalCourses, statusCounts, taWorkload } = data

  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const completed = countByStatus["final_approved"] ?? 0
  const completedPct = totalCourses > 0 ? Math.round((completed / totalCourses) * 100) : 0
  const breakdown = getPhaseBreakdown(countByStatus)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 sm:max-w-md">
        <StatCard label="Total Courses" value={totalCourses} icon="book-open" />
        <StatCard label="Completed" value={completed} icon="check-square" sub={`${completedPct}% of total`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PhaseBreakdown breakdown={breakdown} />
        </div>

        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Staff Workload</CardTitle>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-[10px] uppercase font-bold pl-4 h-9">Staff</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-center h-9">Active</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-center h-9">Needs Fixes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taWorkload.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs py-8">No staff assigned.</TableCell></TableRow>
                ) : (
                  taWorkload.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="py-2 pl-4">
                        <p className="text-sm font-medium">{ta.full_name ?? ta.email}</p>
                        {ta.full_name && <p className="text-[11px] text-muted-foreground">{ta.email}</p>}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{ta.active_courses}</TableCell>
                      <TableCell className="text-center">
                        {ta.needs_fixes > 0 ? (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                            {ta.needs_fixes}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

NOTE: this removes the imports of `StatusBadge` and `CourseStatus`-typed `STATUS_ORDER`, the three coarse StatCards, and the inline `inProgress`/`pendingAdmin`/`withInstructor` sums (all replaced by the breakdown). If `StatCard`'s `sub` prop does not exist, drop the `sub={...}` attribute (check `apps/web/components/shared/stat-card.tsx` — other call sites in `stats-overview.tsx` already pass `sub`, so it exists).

- [ ] **Step 4: Typecheck the web app**

Run: `cd /mnt/data/projects/BrightBridge/apps/web && npx tsc --noEmit`
Expected: no errors. (`countByStatus` is explicitly typed `Partial<Record<CourseStatus, number>>` so it satisfies `getPhaseBreakdown`'s parameter; the component type import is aliased to `PhaseBreakdownData` to avoid colliding with the `PhaseBreakdown` component name.)

- [ ] **Step 5: Commit**

```bash
git add "apps/web/components/admin/stats/phase-colors.ts" "apps/web/components/admin/stats/phase-breakdown.tsx" "apps/web/app/(dashboard)/admin/_components/admin-overview.tsx"
git commit -m "feat(admin): compact phase breakdown on Overview; drop coarse buggy cards"
```

---

## Task 3: Re-base `/admin/stats` charts on `WORKFLOW_PHASES`

**Files:**
- Modify: `apps/web/components/admin/stats/status-pie.tsx`
- Modify: `apps/web/components/admin/stats/completion-funnel.tsx`
- Modify: `apps/web/components/admin/stats/stage-pipeline.tsx`

No unit test (Recharts components); verification is web typecheck + manual.

- [ ] **Step 1: `status-pie.tsx` — segments from the helper**

In `apps/web/components/admin/stats/status-pie.tsx`: (a) remove the entire `const STAGE_GROUPS = [ ... ]` array. (b) add imports `import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"` and `import { PHASE_COLOR } from "./phase-colors"`. (c) replace the `countMap` + `data` derivation (the lines from `const countMap = ...` through the `.filter((d) => d.count > 0)`) with:

```tsx
  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const data = getPhaseBreakdown(countByStatus)
    .map((p) => ({ name: p.label, count: p.total, color: PHASE_COLOR[p.key] }))
    .filter((d) => d.count > 0)
```

Leave the empty-state, `PieLabel`, and the entire JSX render unchanged (they consume `data` items' `name`/`count`/`color`).

- [ ] **Step 2: `completion-funnel.tsx` — stages from the helper**

In `apps/web/components/admin/stats/completion-funnel.tsx`: (a) remove `const FUNNEL_STAGES = [ ... ] as const` and `const STAGE_COLORS = [ ... ]`. (b) add imports `import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"` and `import { PHASE_COLOR } from "./phase-colors"`. (c) replace the `countMap` + `stages` derivation (from `const countMap = ...` through the end of the `const stages = ...` map) with:

```tsx
  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const stages = getPhaseBreakdown(countByStatus).map((p) => ({
    label: p.label,
    count: p.total,
    pct: totalCourses > 0 ? Math.round((p.total / totalCourses) * 100) : 0,
    color: PHASE_COLOR[p.key],
  }))
```

Leave `const maxCount = ...` and the JSX render unchanged (they consume `stage.label`/`count`/`pct`/`color`).

- [ ] **Step 3: `stage-pipeline.tsx` — order from `WORKFLOW_PHASES`, color by phase**

In `apps/web/components/admin/stats/stage-pipeline.tsx`: (a) remove the entire `const STATUS_COLORS: Record<string, string> = { ... }` map. (b) change the imports line from `import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"` to:

```tsx
import { COURSE_STATUS_LABELS, WORKFLOW_PHASES, getPipelineStage } from "@coursebridge/workflow"
import { PHASE_COLOR } from "./phase-colors"
```

(c) Replace the `const data = statusCounts ... .sort(...)` block (the whole derivation, including the inline `order` array) with:

```tsx
  const STATUS_ORDER = WORKFLOW_PHASES.flatMap((p) => p.groups.map((g) => g.statuses[0]))

  const data = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      status: s.status,
      label: COURSE_STATUS_LABELS[s.status] ?? s.status,
      count: s.count,
      pct: totalCourses > 0 ? Math.round((s.count / totalCourses) * 100) : 0,
      color: PHASE_COLOR[getPipelineStage(s.status)],
    }))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
```

(d) In the JSX, change the `<Cell>` fill from `fill={STATUS_COLORS[entry.status] ?? "#6366f1"}` to `fill={entry.color}`. Leave the rest of the chart unchanged.

- [ ] **Step 4: Typecheck the web app**

Run: `cd /mnt/data/projects/BrightBridge/apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/components/admin/stats/status-pie.tsx" "apps/web/components/admin/stats/completion-funnel.tsx" "apps/web/components/admin/stats/stage-pipeline.tsx"
git commit -m "fix(admin-stats): re-base pie/funnel/pipeline on WORKFLOW_PHASES (include instructor_viewing)"
```

---

## Task 4: Final verification

**Files:** none — verification only.

- [ ] **Step 1: Full test + typecheck sweep**

Run: `pnpm -C packages/workflow test` → expect all pass (incl. the 6 new `getPhaseBreakdown` tests).
Run: `pnpm -C packages/workflow typecheck` → clean.
Run: `cd /mnt/data/projects/BrightBridge/apps/web && npx tsc --noEmit` → clean.

- [ ] **Step 2: Confirm no remaining hardcoded stat groupings drop a status**

Run: `grep -rn "STAGE_GROUPS\|FUNNEL_STAGES\|STATUS_COLORS\|STATUS_ORDER" apps/web/components/admin/stats apps/web/app/\(dashboard\)/admin/_components/admin-overview.tsx`
Expected: only `STATUS_ORDER` inside `stage-pipeline.tsx` (now derived from `WORKFLOW_PHASES`), nothing else. No `STAGE_GROUPS`/`FUNNEL_STAGES`/`STATUS_COLORS` remain.

- [ ] **Step 3: Manual check (best-effort)**

Load the Admin → Overview tab: top shows Total + Completed; the Pipeline Breakdown lists 4 phases with per-status short-label chips; phase totals sum to Total. Load `/admin/stats`: pie + funnel show 4 phase segments (Migration · Staging · Instructor · Provision); the pipeline bar includes an "Instructor Viewing" bar colored as the instructor phase. (If a course exists in `instructor_viewing`, confirm it now appears.)

---

## Self-Review

**Spec coverage:**
- §1 `getPhaseBreakdown` (workflow package, returns label+shortLabel) → Task 1.
- §1 short-labels companion `COURSE_STATUS_SHORT_LABELS` → Task 1 Step 1.
- §2 `PHASE_COLOR` → Task 2 Step 1.
- §3 Overview: Total+Completed cards, remove coarse cards, render `<PhaseBreakdown>`, keep Workload → Task 2 Step 3.
- §4 `phase-breakdown.tsx` compact chips using `shortLabel`, zero dimmed → Task 2 Step 2.
- §5 status-pie / completion-funnel / stage-pipeline fixes → Task 3.
- Testing §1-6 (shape, coverage incl. instructor_viewing, totals, grand total, default 0, labels) → Task 1 Step 2.
- Out of scope (queries, stats-overview "In Progress", board, canonical labels) → untouched; Task 4 Step 2 verifies no other groupings linger.

**Placeholder scan:** No TBD/TODO; every code step shows full code; the one conditional ("if `sub` prop doesn't exist") is resolved inline (it does — `stats-overview.tsx` uses it).

**Type consistency:** `getPhaseBreakdown(Partial<Record<CourseStatus, number>>) → PhaseBreakdown[]`; `PhaseBreakdown.statuses: StatusBreakdown[]` with `{status,label,shortLabel,count}`; component imports the type aliased as `PhaseBreakdownData`; `PHASE_COLOR: Record<PipelineStage,string>` keyed by the same `PipelineStage` the helper returns and `getPipelineStage` produces. `countByStatus` typed identically (`Partial<Record<CourseStatus, number>>`) in all three web call sites.
