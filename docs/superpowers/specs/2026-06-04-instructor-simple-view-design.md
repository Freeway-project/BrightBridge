# Instructor Simple View + Guided Walkthrough — Design

**Date:** 2026-06-04
**Branch:** `fix-instructor`
**Status:** Approved (brainstorming)

## Problem

Instructors are often older / less technical and hard to walk through software.
The current instructor course-detail page (`apps/web/app/(dashboard)/instructor/courses/[id]/page.tsx`)
presents a 5-tab workspace (Overview / Review / Questions / Discussion / Timeline)
plus two header actions. That is more surface area than the instructor's actual
job, which is only:

1. See what was reviewed.
2. Either **approve** ("everything is good"), or **ask the TA a question**.

## Goal

Add a **switchable Simple / Full view** with a guided walkthrough, **without
touching the workflow, permissions, or notification layers**. Presentation only.

## Non-goals

- No new course statuses or transitions.
- No new notification plumbing (the feed is derived; see below).
- No change to the Full (5-tab) view — it stays exactly as-is.

## Design

### 1. View toggle

A segmented control at the top of the instructor course page:

```
[ ◉ Simple   |   ○ Full details ]
```

- **Defaults to Simple.**
- Remembers the last choice in `localStorage` (reuse the `useStickyTabState`
  pattern / `coursebridge:` key convention).
- **Full details** renders today's exact 5-tab view, unchanged.

### 2. Simple view = 3-step guided wizard (assigned instructor)

One decision per screen, progress dots `●●●`, large high-contrast buttons.

| Step | Screen | Control | Server action (existing) | Result |
|------|--------|---------|--------------------------|--------|
| 1 | "Look at your course" | review summary (reuse `InstructorReviewDetail`) + Next | — | — |
| 2 | "Any questions?" | "No, looks fine" → Next, or "Yes, I have a question" → question box | `instructorRaiseQuestionAction` | status → `instructor_questions`; question issue owned by TA; TA's derived feed updates |
| 3 | "Approve" | TA final summary + open issues (read-only list) + **single** checkbox "I've reviewed these and approve" | `instructorSignOffAction` | status → `instructor_approved`; admin sees it for final approval |

The two server actions already exist (`.../courses/[id]/actions.ts`) and are
reused verbatim. "Inform the TA" works because notifications are **derived at
read time** in `lib/notifications/queries.ts` from `course_status_events` and
`course_issues` — creating the question issue + status event is what surfaces in
the TA's feed. No push code required.

### 3. Variants

- **Read-only viewers** (dean / dept-head / super-admin via hierarchy): Simple
  view shows **step 1 only** (read-only summary). No questions/approve steps.
- **Non-actionable status** (not `sent_to_instructor` / `instructor_viewing`):
  show a friendly status line instead of the action — e.g. "You've approved this
  course ✓" / "You've sent a question — waiting on the team."

A pure helper `getInstructorSimpleState(status, readOnly)` returns
`{ canAsk, canApprove, statusMessage }` and is unit-tested.

### 4. Guided walkthrough ("Show me around")

- **Library:** `driver.js` (MIT, ~5kb, React 19 compatible) — spotlight cutout,
  focus/keyboard handling, selector-targeted steps.
- **Trigger:** auto-runs **once** on first open of any instructor course
  (persisted in `localStorage`), plus an always-visible **"? Help — show me
  around"** button to replay.
- **High visibility:** dimmed backdrop, bright spotlight, large high-contrast
  card, big Next / Back / Done buttons, one pointer at a time.
- **Drives the wizard** so each control is explained while visible. Targets are
  marked with stable `data-tour="..."` attributes:
  1. Welcome (centered).
  2. `view-toggle` — the two view modes.
  3. `review-summary` (step 1) — "Green ✓ = good, orange ! = flagged."
  4. `ask-question` (step 2) — send a question to the reviewer.
  5. `approve` (step 3) — approve the course.
  6. End — "Tap **? Help** anytime to see this again."

## Components

All under `apps/web/app/(dashboard)/instructor/courses/[id]/_components/`:

- `instructor-course-shell.tsx` (client) — owns `mode` (simple/full, persisted)
  and the wizard `step`; renders the toggle (`data-tour="view-toggle"`), the Help
  button, and either the Simple wizard or the Full node (passed as a prop).
  Hosts the tour controller.
- `instructor-simple-wizard.tsx` (client) — controlled `step`/`onStepChange`,
  renders step content with `data-tour` anchors, calls the two existing actions.
- `instructor-guided-tour.tsx` (client) — wraps driver.js; `start()`, auto-run
  once, coordinates `setStep` with each highlight.
- `apps/web/lib/courses/instructor-view.ts` — `getInstructorSimpleState` helper
  (+ `instructor-view.test.ts`).

`page.tsx` (server) keeps fetching data and renders
`<InstructorCourseShell full={<>…existing tabs…</>} review={<InstructorReviewDetail…/>} … />`,
passing server-rendered nodes as props/children to the client shell.

## Testing

- Unit: `getInstructorSimpleState` across statuses + read-only.
- Manual: toggle persistence; ask-question transitions to `instructor_questions`
  and shows in TA feed; sign-off transitions to `instructor_approved`; tour
  auto-runs once and replays via Help; read-only + non-actionable variants.
```
