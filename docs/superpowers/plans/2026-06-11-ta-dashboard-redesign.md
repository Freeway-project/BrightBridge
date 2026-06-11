# TA Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the TA dashboard (`/ta`) with an action-first compact course card, a single "Today" hero card, a pipeline strip, and a warm indigo accent layered on the existing graphite palette — so a TA can open the page and know in 2 seconds what to do.

**Architecture:** Pure component refactor inside `apps/web` — no DB changes, no new dependencies. Adds 4 new small components (`TodayCard`, `PipelineStrip`, `SectionProgressBar`, plus tiny presentational helpers), rewrites `CourseCard`, updates `page.tsx` composition, and adds color tokens to `globals.css`. Reuses the existing `getBallInCourt` helper from `@coursebridge/workflow`.

**Tech Stack:** Next.js 15 App Router (server components), shadcn/ui primitives, Tailwind CSS with CSS custom properties, Framer Motion for entrance/hover micro-interactions, Vitest for unit tests.

**Spec:** `SOURCE/docs/superpowers/specs/2026-06-11-ta-dashboard-redesign-design.md`

---

## Working Directory Note

All file paths below are relative to `/mnt/data/projects/BrightBridge/SOURCE/`. Commands assume you are running from that directory unless stated otherwise.

Branch to work on: **`ft-azure-main-sync`** (already checked out, includes the merged main features).

---

## File Map

**New files:**
- `apps/web/components/courses/section-progress-bar.tsx` — 3 thin horizontal bars (metadata / matrix / syllabus)
- `apps/web/app/(dashboard)/ta/_components/today-card.tsx` — Hero card listing 4 most-urgent TA-owned courses
- `apps/web/app/(dashboard)/ta/_components/pipeline-strip.tsx` — Stacked horizontal bar (todo / in_progress / pending_admin / done) with counts under it
- `apps/web/lib/courses/ta-pipeline.ts` — Pure function that buckets `CourseSummary[]` into pipeline segments and surfaces the "today" list
- `apps/web/lib/courses/ta-pipeline.test.ts` — Vitest unit tests for the bucketing logic

**Rewritten files:**
- `apps/web/components/courses/course-card.tsx` — Action-first compact layout
- `apps/web/app/(dashboard)/ta/page.tsx` — New composition (header → today → strip → details breakdown → list)

**Modified files:**
- `apps/web/app/globals.css` — Add `--accent-indigo*` and refined status tokens (additive, no removals)

**Untouched (intentional):**
- `apps/web/components/shared/ta-dashboard-insights.tsx` — Still rendered, just demoted into `<details>`. No code change needed inside it.
- `apps/web/components/courses/course-list-view.tsx` — Card-shape change is invisible to the list; no edits.
- `apps/web/app/(dashboard)/ta/_components/ta-dashboard-header.tsx` — Already shows the greeting; only the subhead changes (via prop).

---

## Task 1: Add color tokens to `globals.css`

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Open `apps/web/app/globals.css` and find the `:root` block.** Locate the line `--ev-neon: #a78bfa;` (it's inside the `:root { ... }` block near the top, around line 70-90). We'll add new tokens immediately after it.

- [ ] **Step 2: Add the new color tokens after `--ev-neon`.**

Insert these lines after `--ev-neon: #a78bfa;`:

```css
  /* TA dashboard redesign — "your turn / ownership" accent */
  --accent-indigo: #818cf8;
  --accent-indigo-hover: #6366f1;
  --accent-indigo-soft: color-mix(in srgb, #818cf8 12%, transparent);
  --accent-indigo-glow: color-mix(in srgb, #818cf8 8%, transparent);

  /* TA dashboard redesign — section / pipeline state hues */
  --status-info: #38bdf8;
  --status-warning: #f59e0b;
  --status-success: #10b981;
  --status-danger: #fb7185;
```

- [ ] **Step 3: Register the tokens in the `@theme inline` block so Tailwind exposes utilities for them.**

Find the `@theme inline {` block (further down in the file). It maps CSS variables to Tailwind utility names. Add inside that block, near the other color mappings:

```css
  --color-accent-indigo: var(--accent-indigo);
  --color-accent-indigo-hover: var(--accent-indigo-hover);
  --color-accent-indigo-soft: var(--accent-indigo-soft);
  --color-accent-indigo-glow: var(--accent-indigo-glow);
  --color-status-info: var(--status-info);
  --color-status-warning: var(--status-warning);
  --color-status-success: var(--status-success);
  --color-status-danger: var(--status-danger);
```

This makes `bg-accent-indigo`, `text-status-info`, etc. available as Tailwind classes.

- [ ] **Step 4: Verify Tailwind picks them up.**

Run from `SOURCE/`:
```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only
```

Expected: Build succeeds with no Tailwind warnings. If it fails with "unknown utility class," the `@theme inline` block needs the entry exactly as above.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/app/globals.css
git commit -m "feat(ta-dashboard): add indigo accent + status hue tokens"
```

---

## Task 2: Add `ta-pipeline.ts` helper (with tests)

**Files:**
- Create: `apps/web/lib/courses/ta-pipeline.ts`
- Test: `apps/web/lib/courses/ta-pipeline.test.ts`

This is the pure logic that turns `CourseSummary[]` into:
- 4 pipeline counts (todo / in_progress / pending_admin / done)
- The "today" list (top-4 TA-owned courses, ranked by urgency)

Doing this as pure functions first means the UI components are dumb renderers.

- [ ] **Step 1: Write the failing test.**

Create `apps/web/lib/courses/ta-pipeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bucketTaPipeline, selectTodayCourses } from "./ta-pipeline";
import type { CourseSummary } from "./service";

function course(id: string, status: CourseSummary["status"], updatedAt: string): CourseSummary {
  return {
    id,
    sourceCourseId: id,
    title: `Course ${id}`,
    term: "F25",
    department: "CS",
    status,
    updatedAt,
    reviewProgress: undefined,
  } as CourseSummary;
}

describe("bucketTaPipeline", () => {
  it("buckets each status into the right segment", () => {
    const courses = [
      course("a", "assigned_to_ta", "2026-06-10T00:00:00Z"),       // todo
      course("b", "ta_review_in_progress", "2026-06-10T00:00:00Z"),// in_progress
      course("c", "submitted_to_admin", "2026-06-10T00:00:00Z"),   // pending_admin
      course("d", "final_approved", "2026-06-10T00:00:00Z"),       // done
      course("e", "admin_changes_requested", "2026-06-10T00:00:00Z"), // in_progress (TA-owned, mid-work)
    ];
    const buckets = bucketTaPipeline(courses);
    expect(buckets).toEqual({ todo: 1, inProgress: 2, pendingAdmin: 1, done: 1 });
  });

  it("returns all zeros for an empty list", () => {
    expect(bucketTaPipeline([])).toEqual({ todo: 0, inProgress: 0, pendingAdmin: 0, done: 0 });
  });
});

describe("selectTodayCourses", () => {
  const now = new Date("2026-06-11T12:00:00Z");

  it("returns only courses where the TA is the ball-in-court (staff)", () => {
    const courses = [
      course("ta-1", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
      course("admin-1", "submitted_to_admin", "2026-06-10T00:00:00Z"),
      course("inst-1", "sent_to_instructor", "2026-06-10T00:00:00Z"),
      course("done-1", "final_approved", "2026-06-10T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today.map((c) => c.id)).toEqual(["ta-1"]);
  });

  it("caps at 4 items and ranks by most-recently-updated", () => {
    const courses = [
      course("old", "ta_review_in_progress", "2026-06-01T00:00:00Z"),
      course("new", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
      course("mid", "ta_review_in_progress", "2026-06-05T00:00:00Z"),
      course("changes", "admin_changes_requested", "2026-06-09T00:00:00Z"),
      course("staging", "staging_in_progress", "2026-06-08T00:00:00Z"),
      course("just-assigned", "assigned_to_ta", "2026-06-11T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today).toHaveLength(4);
    expect(today.map((c) => c.id)).toEqual(["just-assigned", "new", "changes", "staging"]);
  });

  it("excludes courses last touched more than 14 days ago", () => {
    const courses = [
      course("stale", "ta_review_in_progress", "2026-05-01T00:00:00Z"),
      course("fresh", "ta_review_in_progress", "2026-06-10T00:00:00Z"),
    ];
    const today = selectTodayCourses(courses, now);
    expect(today.map((c) => c.id)).toEqual(["fresh"]);
  });
});
```

- [ ] **Step 2: Run the test — it should fail (module doesn't exist).**

```bash
cd apps/web && npx vitest run lib/courses/ta-pipeline.test.ts 2>&1 | tail -20
```

Expected: `Cannot find module './ta-pipeline'` or similar.

- [ ] **Step 3: Implement `ta-pipeline.ts`.**

Create `apps/web/lib/courses/ta-pipeline.ts`:

```ts
import { getBallInCourt, type CourseStatus } from "@coursebridge/workflow";
import type { CourseSummary } from "./service";

export type PipelineBuckets = {
  todo: number;
  inProgress: number;
  pendingAdmin: number;
  done: number;
};

const TODO_STATUSES = new Set<CourseStatus>(["course_created", "assigned_to_ta"]);
const IN_PROGRESS_STATUSES = new Set<CourseStatus>([
  "ta_review_in_progress",
  "admin_changes_requested",
  "staging_in_progress",
]);
const PENDING_ADMIN_STATUSES = new Set<CourseStatus>([
  "submitted_to_admin",
  "waiting_on_admin",
  "ready_for_instructor",
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
]);
const DONE_STATUSES = new Set<CourseStatus>(["final_approved"]);

export function bucketTaPipeline(courses: CourseSummary[]): PipelineBuckets {
  const out: PipelineBuckets = { todo: 0, inProgress: 0, pendingAdmin: 0, done: 0 };
  for (const c of courses) {
    if (TODO_STATUSES.has(c.status)) out.todo += 1;
    else if (IN_PROGRESS_STATUSES.has(c.status)) out.inProgress += 1;
    else if (PENDING_ADMIN_STATUSES.has(c.status)) out.pendingAdmin += 1;
    else if (DONE_STATUSES.has(c.status)) out.done += 1;
  }
  return out;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TODAY_LIMIT = 4;

export function selectTodayCourses(courses: CourseSummary[], now: Date = new Date()): CourseSummary[] {
  const cutoff = now.getTime() - FOURTEEN_DAYS_MS;
  return courses
    .filter((c) => getBallInCourt(c.status) === "staff")
    .filter((c) => new Date(c.updatedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, TODAY_LIMIT);
}
```

- [ ] **Step 4: Run the tests — they should pass.**

```bash
cd apps/web && npx vitest run lib/courses/ta-pipeline.test.ts 2>&1 | tail -10
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/lib/courses/ta-pipeline.ts apps/web/lib/courses/ta-pipeline.test.ts
git commit -m "feat(ta-dashboard): pure helpers for pipeline bucketing + today selection"
```

---

## Task 3: Build `SectionProgressBar` component

**Files:**
- Create: `apps/web/components/courses/section-progress-bar.tsx`

A presentational component that renders three thin colored bars (metadata / matrix / syllabus). Replaces the existing text-based 3-cell grid at the bottom of the card.

- [ ] **Step 1: Create the file.**

Create `apps/web/components/courses/section-progress-bar.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { ReviewProgress } from "@/lib/courses/service";

type SectionState = "not_started" | "in_progress" | "submitted";

function stateOf(section: ReviewProgress["courseMetadata"] | undefined): SectionState {
  if (!section?.exists) return "not_started";
  if (section.status === "submitted") return "submitted";
  return "in_progress";
}

interface Props {
  progress?: ReviewProgress;
}

const BAR_CLASS: Record<SectionState, string> = {
  not_started: "bg-border/40",
  in_progress: "bg-status-info w-[40%]",
  submitted: "bg-status-success w-full",
};

const SECTIONS = [
  { key: "metadata", label: "Metadata" },
  { key: "matrix", label: "Matrix" },
  { key: "syllabus", label: "Syllabus" },
] as const;

export function SectionProgressBar({ progress }: Props) {
  const states: Record<(typeof SECTIONS)[number]["key"], SectionState> = {
    metadata: stateOf(progress?.courseMetadata),
    matrix: stateOf(progress?.reviewMatrix),
    syllabus: stateOf(progress?.syllabusReview),
  };

  return (
    <div className="grid grid-cols-3 gap-3" aria-label="Section progress">
      {SECTIONS.map((s) => {
        const state = states[s.key];
        return (
          <div key={s.key} className="space-y-1">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-border/40"
              aria-label={`${s.label}: ${state.replace("_", " ")}`}
            >
              {state !== "not_started" && (
                <div className={cn("h-full rounded-full transition-all duration-500", BAR_CLASS[state])} />
              )}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles.**

Run from `SOURCE/`:
```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -10
```

Expected: Build succeeds. (The component isn't wired in yet — we're checking TypeScript compiles.)

If you get an error about `ReviewProgress["courseMetadata"]` being possibly undefined, the helper already handles that via `section?.exists`. Don't change it.

- [ ] **Step 3: Commit.**

```bash
git add apps/web/components/courses/section-progress-bar.tsx
git commit -m "feat(ta-dashboard): SectionProgressBar component"
```

---

## Task 4: Rewrite `CourseCard` with the new action-first layout

**Files:**
- Modify: `apps/web/components/courses/course-card.tsx` (full rewrite)

The new card has 4 rows: identity, action, progress, meta+CTA. ~120-140px tall vs the old ~220-260px.

- [ ] **Step 1: Replace the entire file.**

Overwrite `apps/web/components/courses/course-card.tsx` with:

```tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { SectionProgressBar } from "./section-progress-bar";
import { type CourseStatus, getBallInCourt } from "@coursebridge/workflow";
import { motion } from "framer-motion";
import { ArrowRight, Play, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReviewProgress } from "@/lib/courses/service";

interface CourseCardProps {
  course: {
    id: string;
    sourceCourseId: string | null;
    title: string;
    term: string | null;
    department: string | null;
    status: CourseStatus;
    updatedAt: string;
    reviewProgress?: ReviewProgress;
  };
  issueCounts?: { open: number; resolved: number };
  index?: number;
}

export function CourseCard({ course, issueCounts, index = 0 }: CourseCardProps) {
  const { action, ownerLabel, ownerIsYou } = deriveAction(course.status);
  const lastTouched = relativeTime(course.updatedAt);
  const open = issueCounts?.open ?? 0;
  const resolved = issueCounts?.resolved ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        href={`/courses/${course.id}/metadata`}
        className="block focus:outline-none"
        aria-label={`${course.sourceCourseId ?? "NO-CODE"} ${course.title} — ${action}`}
      >
        <Card
          className={cn(
            "group/card relative overflow-hidden border border-border/60 bg-card p-5 transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-accent-indigo/40",
            "hover:shadow-[0_0_24px_var(--accent-indigo-glow)]",
            "focus-within:ring-2 focus-within:ring-accent-indigo/50",
          )}
        >
          <div className="space-y-3">
            {/* Row 1: identity */}
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-xs font-medium text-muted-foreground/70">
                  {course.sourceCourseId ?? "NO-CODE"}
                </span>
                <span className="truncate text-base font-semibold text-foreground">
                  {course.title}
                </span>
                {course.term && (
                  <span className="text-xs text-muted-foreground/60">· {course.term}</span>
                )}
              </div>
              <StatusBadge status={course.status} className="h-5 shrink-0" />
            </div>

            {/* Row 2: action — the hero */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Play className="size-4 fill-current text-accent-indigo" />
                <span className="relative text-sm font-medium text-foreground">
                  {action}
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent-indigo transition-transform duration-200 group-hover/card:scale-x-100" />
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  ownerIsYou
                    ? "bg-accent-indigo-soft text-accent-indigo"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {ownerIsYou ? "YOU" : ownerLabel}
              </span>
            </div>

            {/* Row 3: progress strip */}
            <SectionProgressBar progress={course.reviewProgress} />

            {/* Row 4: meta + CTA */}
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {open > 0 && (
                  <span className="inline-flex items-center gap-1 text-status-danger">
                    <AlertCircle className="size-3" />
                    {open} {open === 1 ? "issue" : "issues"}
                  </span>
                )}
                <span>last touched {lastTouched}</span>
                {resolved > 0 && (
                  <span className="inline-flex items-center gap-1 text-status-success/80">
                    <CheckCircle2 className="size-3" />
                    {resolved}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-accent-indigo hover:bg-accent-indigo-soft hover:text-accent-indigo-hover"
                asChild
              >
                <span>
                  Open
                  <ArrowRight className="size-3 transition-transform group-hover/card:translate-x-0.5" />
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function deriveAction(status: CourseStatus): {
  action: string;
  ownerLabel: string;
  ownerIsYou: boolean;
} {
  const ball = getBallInCourt(status);
  const ownerIsYou = ball === "staff";

  let action: string;
  let ownerLabel: string;

  switch (status) {
    case "course_created":
      action = "Awaiting reviewer assignment";
      ownerLabel = "ADMIN";
      break;
    case "assigned_to_ta":
      action = "Start TA review";
      ownerLabel = "YOU";
      break;
    case "ta_review_in_progress":
      action = "Continue your review";
      ownerLabel = "YOU";
      break;
    case "submitted_to_admin":
      action = "Awaiting admin review";
      ownerLabel = "ADMIN";
      break;
    case "admin_changes_requested":
      action = "Address requested changes";
      ownerLabel = "YOU";
      break;
    case "waiting_on_admin":
      action = "Awaiting staging shell";
      ownerLabel = "ADMIN";
      break;
    case "staging_in_progress":
      action = "Finalize the course";
      ownerLabel = "YOU";
      break;
    case "ready_for_instructor":
      action = "Awaiting send to instructor";
      ownerLabel = "ADMIN";
      break;
    case "sent_to_instructor":
    case "instructor_viewing":
      action = "With the instructor";
      ownerLabel = "INSTRUCTOR";
      break;
    case "instructor_questions":
      action = "Awaiting admin response";
      ownerLabel = "ADMIN";
      break;
    case "instructor_approved":
      action = "Awaiting final approval";
      ownerLabel = "ADMIN";
      break;
    case "final_approved":
      action = "Completed";
      ownerLabel = "DONE";
      break;
    default:
      action = "Review status";
      ownerLabel = ball.toUpperCase();
  }

  return { action, ownerLabel, ownerIsYou };
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(ms / 3_600_000);
    if (hours === 0) return "just now";
    return `${hours}h ago`;
  }
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
```

- [ ] **Step 2: Verify the build still passes.**

Run from `SOURCE/`:
```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -15
```

Expected: Build succeeds.

If TypeScript complains that `canExport` was a required prop and is now missing in the call sites: check `course-list-view.tsx` — it passes `canExport={canExport}` to `<CourseCard>`. We're intentionally dropping that prop. Search for any remaining usages with `grep -rn "canExport" apps/web/components/courses/`. Remove the prop from the call site in `course-list-view.tsx` if it errors.

- [ ] **Step 3: Open the TA dashboard in the browser and visually verify.**

From `SOURCE/`:
```bash
npm run dev --workspace=@coursebridge/web
```

Navigate to `http://localhost:3000/ta` (you'll need to be logged in). The course cards should now be shorter, with the "YOU" pill on TA-owned courses in indigo. Hover a card — the indigo underline should draw under the action text.

- [ ] **Step 4: Commit.**

```bash
git add apps/web/components/courses/course-card.tsx
# If course-list-view.tsx was edited to drop canExport: also stage it
git add apps/web/components/courses/course-list-view.tsx 2>/dev/null || true
git commit -m "feat(ta-dashboard): action-first compact CourseCard"
```

---

## Task 5: Build `PipelineStrip` component

**Files:**
- Create: `apps/web/app/(dashboard)/ta/_components/pipeline-strip.tsx`

A single horizontal stacked bar showing todo / in-progress / pending-admin / done segments, with the count breakdown below.

- [ ] **Step 1: Create the file.**

Create `apps/web/app/(dashboard)/ta/_components/pipeline-strip.tsx`:

```tsx
"use client";

import type { PipelineBuckets } from "@/lib/courses/ta-pipeline";
import { cn } from "@/lib/utils";

interface Props {
  counts: PipelineBuckets;
}

const SEGMENTS = [
  { key: "todo", label: "todo", className: "bg-muted-foreground/40" },
  { key: "inProgress", label: "in progress", className: "bg-status-info" },
  { key: "pendingAdmin", label: "with admin", className: "bg-status-warning" },
  { key: "done", label: "done", className: "bg-status-success" },
] as const;

export function PipelineStrip({ counts }: Props) {
  const total = counts.todo + counts.inProgress + counts.pendingAdmin + counts.done;
  if (total === 0) return null;

  return (
    <div className="space-y-2" aria-label="Course pipeline">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/30">
        {SEGMENTS.map((s) => {
          const value = counts[s.key];
          if (value === 0) return null;
          const pct = (value / total) * 100;
          return (
            <div
              key={s.key}
              className={cn("h-full transition-all duration-500", s.className)}
              style={{ width: `${pct}%` }}
              aria-label={`${value} ${s.label}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", s.className)} />
            <span className="tabular-nums font-semibold text-foreground">{counts[s.key]}</span>
            <span>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles.**

```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 3: Commit.**

```bash
git add apps/web/app/\(dashboard\)/ta/_components/pipeline-strip.tsx
git commit -m "feat(ta-dashboard): PipelineStrip component"
```

---

## Task 6: Build `TodayCard` component

**Files:**
- Create: `apps/web/app/(dashboard)/ta/_components/today-card.tsx`

Lists up to 4 TA-owned courses needing action, with a single CTA jumping into the filtered queue.

- [ ] **Step 1: Create the file.**

Create `apps/web/app/(dashboard)/ta/_components/today-card.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { CourseSummary } from "@/lib/courses/service";

interface Props {
  courses: CourseSummary[];
  totalWaiting: number;
}

const PHRASES: Record<string, string> = {
  assigned_to_ta: "just assigned",
  ta_review_in_progress: "in progress",
  admin_changes_requested: "changes requested",
  staging_in_progress: "staging in progress",
};

export function TodayCard({ courses, totalWaiting }: Props) {
  if (courses.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-accent-indigo/30 bg-card p-5 shadow-[0_0_32px_var(--accent-indigo-glow)]"
      aria-label="Today's queue"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-indigo">
        <Sparkles className="size-3.5" />
        Today
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Continue review on:
      </p>

      <ul className="mb-4 space-y-2">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}/metadata`}
              className="group flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent-indigo-soft"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground/70">
                  {c.sourceCourseId ?? "NO-CODE"}
                </span>
                <span className="truncate text-sm font-medium text-foreground group-hover:text-accent-indigo">
                  {c.title}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {PHRASES[c.status] ?? "needs review"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>
          {totalWaiting} {totalWaiting === 1 ? "course" : "courses"} waiting on you
        </span>
        <Link
          href="#course-list"
          className="inline-flex items-center gap-1 font-semibold text-accent-indigo hover:text-accent-indigo-hover"
        >
          Open queue
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles.**

```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 3: Commit.**

```bash
git add apps/web/app/\(dashboard\)/ta/_components/today-card.tsx
git commit -m "feat(ta-dashboard): TodayCard component"
```

---

## Task 7: Update `ta-dashboard-header.tsx` to take a `subtitle` prop

**Files:**
- Modify: `apps/web/app/(dashboard)/ta/_components/ta-dashboard-header.tsx`

Tiny change — add an optional subtitle line below the greeting (e.g., "You have 4 courses waiting on you today.").

- [ ] **Step 1: Edit the file.**

Replace the existing file content with:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TaDashboardHeaderProps {
  firstName: string;
  subtitle?: string;
}

export function TaDashboardHeader({ firstName, subtitle }: TaDashboardHeaderProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  return (
    <div className="relative mb-5 flex flex-row items-start justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Hey, <span className="bg-gradient-to-r from-accent-indigo to-violet-500 bg-clip-text text-transparent">{firstName}</span>.
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className="h-8 gap-2 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline text-xs font-medium">Refresh</span>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build.**

```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 3: Commit.**

```bash
git add apps/web/app/\(dashboard\)/ta/_components/ta-dashboard-header.tsx
git commit -m "feat(ta-dashboard): header accepts optional subtitle"
```

---

## Task 8: Recompose `page.tsx` with the new layout

**Files:**
- Modify: `apps/web/app/(dashboard)/ta/page.tsx` (full rewrite)

Wire all the new pieces in. The insight cards stay in the file but move into a collapsible `<details>` block.

- [ ] **Step 1: Replace the file content.**

Overwrite `apps/web/app/(dashboard)/ta/page.tsx` with:

```tsx
import { getAccessibleCourses } from "@/lib/courses/service";
import { CourseListView } from "@/components/courses/course-list-view";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { TaRefreshWrapper } from "./_components/ta-refresh-wrapper";
import { getIssueCountsForCoursesAction } from "@/lib/issues/actions";
import { requireProfile } from "@/lib/auth/context";
import { TaDashboardInsights } from "@/components/shared/ta-dashboard-insights";
import { TaDashboardHeader } from "./_components/ta-dashboard-header";
import { ScrollCollapsibleHeader } from "./_components/scroll-collapsible-header";
import { TodayCard } from "./_components/today-card";
import { PipelineStrip } from "./_components/pipeline-strip";
import { bucketTaPipeline, selectTodayCourses } from "@/lib/courses/ta-pipeline";

export default async function TADashboardPage() {
  const { courses } = await getAccessibleCourses();
  const ctx = await requireProfile();

  const courseIds = courses.map((c) => c.id);
  const issueCountsMap = await getIssueCountsForCoursesAction(courseIds);
  const issueCounts = Object.fromEntries(issueCountsMap);

  const firstName = ctx.profile.fullName?.split(" ")[0] || "there";
  const today = selectTodayCourses(courses);
  const buckets = bucketTaPipeline(courses);

  const subtitle =
    today.length === 0
      ? "Nothing urgent for you right now."
      : `You have ${today.length} course${today.length === 1 ? "" : "s"} waiting on you today.`;

  return (
    <TweakableContent className="min-w-0 flex-1 overflow-hidden">
      <div id="ta-dashboard-scroll" className="relative h-full overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <ScrollCollapsibleHeader>
          <TaDashboardHeader firstName={firstName} subtitle={subtitle} />

          <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            {today.length > 0 ? (
              <TodayCard courses={today} totalWaiting={today.length} />
            ) : (
              <div />
            )}
            <div className="min-w-[280px] space-y-2">
              <PipelineStrip counts={buckets} />
            </div>
          </div>

          <details className="mb-5 group/details">
            <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-1.5">
                Show breakdown
                <span className="transition-transform group-open/details:rotate-90">›</span>
              </span>
            </summary>
            <div className="mt-3">
              <TaDashboardInsights courses={courses} issueCounts={issueCounts} />
            </div>
          </details>
        </ScrollCollapsibleHeader>

        <TaRefreshWrapper>
          <div id="course-list" className="scroll-mt-4">
            <CourseListView
              initialCourses={courses}
              issueCounts={issueCounts}
              canExport={ctx.profile.role === "admin_full" || ctx.profile.role === "super_admin"}
              scrollable={false}
            />
          </div>
        </TaRefreshWrapper>
      </div>
    </TweakableContent>
  );
}
```

- [ ] **Step 2: Build to verify.**

From `SOURCE/`:
```bash
npx turbo build --filter=@coursebridge/web --output-logs=errors-only 2>&1 | tail -15
```

Expected: Build succeeds.

- [ ] **Step 3: Visual check.**

If dev server isn't running:
```bash
npm run dev --workspace=@coursebridge/web
```

Navigate to `http://localhost:3000/ta`. You should see:
1. Greeting line + "You have N courses waiting on you today." subtitle
2. "Today" indigo-glow card on the left + Pipeline strip on the right
3. "Show breakdown ›" collapsible — clicking it reveals the old 4 insight cards
4. Below that, the existing search/filter/tabs bar
5. Compact course cards, hover shows indigo underline on the action text

If "Today" card text overflows on small viewports, drop the lg:grid-cols-[1fr_auto] to grid-cols-1.

- [ ] **Step 4: Commit.**

```bash
git add apps/web/app/\(dashboard\)/ta/page.tsx
git commit -m "feat(ta-dashboard): recompose page with TodayCard, PipelineStrip, collapsed insights"
```

---

## Task 9: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Full TypeScript build.**

From `SOURCE/`:
```bash
npx turbo build 2>&1 | tail -20
```

Expected: All 7 workspace tasks succeed.

- [ ] **Step 2: Run all tests.**

```bash
cd apps/web && npx vitest run 2>&1 | tail -10
cd ../../packages/workflow && npx vitest run 2>&1 | tail -10
```

Expected: All tests pass. Specifically the new `ta-pipeline.test.ts` (5 tests) and the existing `transitions.test.ts` (no regressions).

- [ ] **Step 3: Manual UI sweep at `/ta`.**

Confirm each of these:
- [ ] Greeting shows the first name with indigo→violet gradient.
- [ ] Subtitle reflects the right count of "waiting on you" courses.
- [ ] Today card appears only if at least 1 course is owned by TA + fresh (≤14 days).
- [ ] Today card has an indigo glow shadow.
- [ ] Pipeline strip shows correct segment widths (proportional to counts).
- [ ] "Show breakdown" toggle reveals/hides the 4 insight cards.
- [ ] Course cards are ~40% shorter than before.
- [ ] Hover on a card draws an indigo underline under the action text.
- [ ] "YOU" pill is indigo on TA-owned courses; "ADMIN"/"INSTRUCTOR"/"DONE" pill is neutral on others.
- [ ] Three thin progress bars at the bottom reflect submitted (green/full), in_progress (sky/40%), not_started (empty).
- [ ] `⚠ 3 issues` appears in rose color when open > 0.
- [ ] Card click navigates to `/courses/<id>/metadata`.
- [ ] Keyboard tab: greeting → Today CTA → pipeline (visually focusable) → search → tabs → first card → next card.

- [ ] **Step 4: Final commit if anything was tweaked.**

If the visual sweep surfaced a small adjustment (e.g. spacing or a missing aria-label), make it and commit:

```bash
git add -p
git commit -m "fix(ta-dashboard): <specific tweak>"
```

If nothing needed adjusting, skip this step.

---

## Self-Review Notes

**Spec coverage (each spec section → task that implements it):**
- Header / Today card / Pipeline strip → Tasks 5, 6, 7, 8
- Course card 4-row layout → Task 4
- Section progress bars → Task 3
- Color & ambience (indigo + status tokens) → Task 1
- `getBallInCourt` reuse → already exists (no task needed)
- TodayCard filter rule (TA-owned + ≤14 days, cap 4) → Task 2 (logic) + Task 6 (render)
- Pipeline strip with 4 segments → Tasks 2 (logic) + 5 (render)
- Insights demoted to `<details>` → Task 8
- Excel/PDF buttons removed from card → Task 4 (props dropped)
- All a11y items (aria-labels, focus rings, keyboard order) → Tasks 3, 4, 6, 9

**Type consistency check:**
- `PipelineBuckets` defined in Task 2, consumed identically in Task 5.
- `CourseSummary` consumed in Tasks 2, 4, 6, 8 — same shape everywhere (imported from `@/lib/courses/service`).
- `ReviewProgress` in Tasks 3 and 4 — both use the optional `section?.exists`/`section?.status` pattern.
- `getBallInCourt` returns `"staff" | "admin" | "instructor" | "done"` (verified in workflow source) — used consistently in Tasks 2 and 4.

**No placeholders:** every code block is complete and self-contained. No TBDs.
