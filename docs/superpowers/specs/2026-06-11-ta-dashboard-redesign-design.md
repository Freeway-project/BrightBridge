# Design: TA Dashboard Redesign — Course Card + Header + Ambience

**Date:** 2026-06-11
**Surface:** `/ta` (TA Dashboard)
**Files touched:**
- `app/(dashboard)/ta/page.tsx`
- `app/(dashboard)/ta/_components/ta-dashboard-header.tsx`
- `app/(dashboard)/ta/_components/today-card.tsx` *(new)*
- `app/(dashboard)/ta/_components/pipeline-strip.tsx` *(new)*
- `components/courses/course-card.tsx` *(rewrite)*
- `components/courses/section-progress-bar.tsx` *(new)*
- `app/globals.css` *(palette additions, no breaking changes)*

---

## Goals

1. **TA opens the page and knows in 2 seconds what to do today** — not "here are 4 metrics, you figure it out."
2. **Each course card has one obvious primary action** instead of 5 competing typographic elements.
3. **Color carries meaning** — the new indigo accent says "this is yours," status hues say "this is the workflow state." No collision.
4. **Information density goes up, visual noise goes down.** ~40% shorter card, more courses per screen.

---

## Decisions (from brainstorm)

| Question | Choice |
|----------|--------|
| Card style | Action-first compact |
| Header layout | Hero greeting + single "Today" card + thin pipeline strip |
| Ambience | Warm indigo/violet accent on existing graphite base |

---

## Visual Spec

### Header

```
Good morning, Harsh.
You have 4 courses waiting on you today.

┌─ TODAY ────────────────────────────────────────────┐
│  Continue review on:                                │
│   · CS101 Data Structures      2d in progress      │
│   · CS220 Operating Systems    just assigned       │
│   · CS330 AI                   changes requested   │
│                                    [Open queue →]  │
└─────────────────────────────────────────────────────┘
▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
4 todo · 3 in progress · 1 with admin · 4 done
```

**Behavior:**
- "Today" card only shows courses where `ballInCourt === "ta"` AND not in a stuck state (≤14 days). Cap at 4 items + "and N more" link.
- "Open queue →" jumps to the list view with `?filter=mine&phase=staging` preset.
- Pipeline strip is a single horizontal stacked bar (todo / in-progress / pending-admin / done segments). Click a segment → filters the list below to that segment.
- The four insight cards (donut, section-coverage bars, issues, attention) are removed from this view. They move into an expandable `<details>Show breakdown</details>` below the pipeline strip for users who want the deep metrics.

### Course Card

```
┌────────────────────────────────────────────────────────┐
│  [CS101] Data Structures · F25      [● TA Review]      │  ← row 1: identity
│                                                         │
│  ▶  Continue your review                Owner: YOU     │  ← row 2: action
│     ─────────────────────────                          │
│  ▓▓▓▓▓▓▓▓░░  ▓▓▓▓░░░░░░  ░░░░░░░░░░                   │  ← row 3: progress
│  Metadata     Matrix      Syllabus                     │
│                                                         │
│  ⚠ 3 issues · last touched 2d ago        [Open →]     │  ← row 4: meta + CTA
└────────────────────────────────────────────────────────┘
```

**Visual rules:**

- **Card shell:** `rounded-2xl border border-border/60 bg-card`. No left accent rail (was 3px, replaced by status pill in row 1). On hover: subtle indigo glow `shadow-[0_0_24px_rgba(129,140,248,0.08)]` + `border-accent-indigo/40`.

- **Row 1 (identity, ~24px height):**
  - Course code in muted-foreground/70, monospace, no longer black uppercase shouting.
  - Title in `text-base font-semibold text-foreground`.
  - Term as inline `· F25` after a middle dot, not a chip — saves horizontal space.
  - Status badge right-aligned: `<StatusBadge>` with dot + label, no border, smaller (h-5).

- **Row 2 (action, ~32px height) — the hero of the card:**
  - Big play-arrow icon (`▶`) in indigo `text-accent-indigo`.
  - Action text in `text-sm font-medium text-foreground`.
  - **Underline animation:** when card hovers, a 24px indigo underline draws beneath the action text (CSS keyframe). This is the card's "I'm ready" affordance.
  - Right side: `Owner: YOU` in indigo-100 pill if owner is TA, else `Owner: Admin` etc. in neutral muted. The "YOU" is the loudest thing in the card when applicable.

- **Row 3 (progress strip, ~28px height):**
  - Three thin horizontal bars (8px tall, `rounded-full`), one per section: Metadata, Review Matrix, Syllabus.
  - **States:**
    - `not_started` → `bg-border/40` (empty trough)
    - `in_progress` → `bg-sky-500/60` (filled to ~40%)
    - `submitted` → `bg-emerald-500` (filled 100%)
  - Tiny label under each bar in `text-[10px] uppercase tracking-wider text-muted-foreground/60`.
  - Replaces the current text-based 3-cell grid ("Submitted / In Progress / Not Started"). Glanceable in 200ms instead of needing to read 3 words.

- **Row 4 (meta + CTA, ~28px height):**
  - Left side, all in `text-xs text-muted-foreground`:
    - `⚠ 3 issues` only if `open > 0`, in rose-400. Click → opens course on Issues tab directly.
    - `· last touched 2d ago` always.
    - `· 12 ✓` only if `resolved > 0`, in emerald-400 (much smaller than the warning).
  - Right side: single `[Open →]` ghost button. The whole card is also clickable — the button is just for keyboard/screen-reader affordance.
  - Excel/PDF buttons removed from card. Move to a single bulk-export bar above the list (admin/super_admin only). Cards stay clean for all users.

**Total card height:** ~120-140px (current is ~220-260px). Roughly 40% shorter → ~7 cards visible per laptop screen instead of 4.

### Color & Ambience

Adds **one** new semantic token (indigo accent) plus a few utility tokens. Existing palette unchanged.

```css
/* additions to globals.css :root */
--accent-indigo: #818cf8;          /* the new "this is yours" accent */
--accent-indigo-hover: #6366f1;    /* deeper on hover */
--accent-indigo-soft: color-mix(in srgb, #818cf8 12%, transparent);
--accent-indigo-glow: color-mix(in srgb, #818cf8 8%, transparent);

/* refinements */
--status-info: #38bdf8;            /* sky-500 — in-progress sections */
--status-warning: #f59e0b;         /* amber-500 — changes requested */
--status-success: #10b981;         /* emerald-500 — done / submitted */
--status-danger: #fb7185;          /* rose-400 — open issues */
```

**Where indigo shows up:**
- The `▶` action icon on every card
- The "YOU" owner pill background (`bg-accent-indigo/15 text-accent-indigo`)
- The animated underline under the next-action text on hover
- The primary CTA button in the Today card (`Open queue →`)
- Focus rings on interactive elements (`ring-2 ring-accent-indigo/50`)

**Where status colors stay:**
- StatusBadge dots (unchanged — blue/orange/indigo/emerald per workflow state)
- Pipeline strip segments
- Progress bars in row 3

**Result:** Indigo = "your turn / your action." Status hues = "workflow state." The two never compete because they live in different parts of the card.

### Motion

- **Card entrance:** stagger fade-in (existing pattern kept) — `opacity 0→1, y 12→0, delay i*0.04s, duration 0.35s`.
- **Card hover:** `translate-y -2px` + indigo glow shadow + underline draw on action text — all `transition-all duration-200`.
- **Action-row underline:** keyframe `scale-x 0→1 from left`, 200ms ease-out, ONLY on hover. Looks like the card is highlighting "do this next."
- **Pipeline strip segments:** click → segment scales briefly (1 → 1.02 → 1) to confirm filter applied.

No new Framer Motion patterns; everything is CSS transitions or existing motion presets.

---

## Component Architecture

```
TADashboardPage
├── TaDashboardHeader              (greeting line + course count line)
├── TodayCard                      (NEW — top 4 actionable items)
├── PipelineStrip                  (NEW — stacked horizontal bar + counts)
├── <details> Show breakdown
│   └── TaDashboardInsights        (existing 4-card grid, now collapsed by default)
└── CourseListView
    ├── Filters (search/subject/term/phase tabs — existing)
    └── CourseCard[]               (REWRITTEN — action-first compact)
        └── SectionProgressBar     (NEW — three thin bars)
```

Each new component is ~80 lines or less. No god-component creep.

### `TodayCard` props
```ts
interface TodayCardProps {
  firstName: string;
  courses: CourseSummary[];           // already filtered to ball-in-court=TA
  totalAssigned: number;
  metrics: { openIssues: number; withInstructor: number };
}
```

### `PipelineStrip` props
```ts
interface PipelineStripProps {
  counts: { todo: number; inProgress: number; pendingAdmin: number; done: number };
  onSegmentClick?: (segment: PipelineSegment) => void;
}
```

### `SectionProgressBar` props
```ts
interface SectionProgressBarProps {
  metadata: ProgressStatus;
  matrix: ProgressStatus;
  syllabus: ProgressStatus;
}
```

---

## Data Already Available

Nothing new from the DB. All data exists:
- `CourseSummary.status` → ballInCourt via `getBallInCourt(status)` (workflow package)
- `CourseSummary.reviewProgress` → three section statuses
- `issueCounts[courseId]` → open/resolved per course
- `CourseSummary.updatedAt` → "last touched 2d ago"

The `ballInCourt` helper may need adding if not already in `@coursebridge/workflow`. Quick check: the 2026-06-03 TA workflow clarity spec mentioned `getBallInCourt` — if delivered, reuse it; if not, add it as a small helper:

```ts
// packages/workflow/src/ball-in-court.ts
export function getBallInCourt(status: CourseStatus): "ta" | "admin" | "instructor" | "none" {
  switch (status) {
    case "assigned_to_ta":
    case "ta_review_in_progress":
    case "admin_changes_requested":
    case "staging_in_progress":
      return "ta";
    case "course_created":
    case "submitted_to_admin":
    case "waiting_on_admin":
    case "ready_for_instructor":
    case "instructor_questions":
    case "instructor_approved":
      return "admin";
    case "sent_to_instructor":
    case "instructor_viewing":
      return "instructor";
    case "final_approved":
      return "none";
  }
}
```

---

## Out of Scope

- Admin dashboard redesign (separate spec)
- Instructor surface
- Dark/light theme switching
- New DB columns or migrations
- Notification system changes
- Mobile-specific layout (responsive defaults will work, but no dedicated mobile spec)

---

## Verification

1. **Visual:** Side-by-side screenshot of old vs new card. New card ≤ 60% the height. Action row is the eye-catcher.
2. **Behavior:**
   - "Today" card shows only TA-owned courses, capped at 4.
   - Pipeline strip click filters the list below.
   - Card hover draws the indigo underline.
   - Clicking the card opens the course detail.
3. **Build/test:** `npm run build` passes. No new test dependencies. Existing `transitions.test.ts` still passes.
4. **A11y:** Tab order: greeting → Today CTA → pipeline segments → search → tabs → card 1 CTA → card 2 CTA. Each card has `role="article"` with aria-label including course code + title + status.

---

## Implementation Order

1. Add color tokens to `globals.css` — no behavioural change yet
2. Build `SectionProgressBar` standalone, write a single demo cell
3. Rewrite `CourseCard` using new layout — verify by viewing TA dashboard
4. Add `getBallInCourt` to workflow package if missing
5. Build `TodayCard`
6. Build `PipelineStrip`
7. Update `page.tsx` to compose the new header layout, demote insights into `<details>`
8. Manual sweep: hover states, focus rings, keyboard navigation
9. Build + verify
