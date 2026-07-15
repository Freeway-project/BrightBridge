# Instructor Handoff Tracker — Design

**Date:** 2026-07-15
**Branch:** `ft-instructor-handoff-tracker`
**Status:** Approved (design), implementation in progress

## Problem

Admins have no single view of where each course sits *after it has been sent to
the instructor*. They can't quickly answer: which courses have been sitting with
a professor too long, which the professor never even opened, and which are close
to approval. Today the only staleness signal is `courses.updated_at`, which is a
poor proxy — it bumps on unrelated edits and does **not** move when a course is
opened, commented on, or has a question filed.

## Goal

One section on `/admin/stats` — the **Instructor Handoff Tracker** — that shows
every course currently in the instructor's hands, how long it has been there,
whether the instructor has opened it, and buckets each into a staleness colour so
lag is obvious at a glance. Admins should see overall health, per-instructor
health, and a drill-down list.

Scope is deliberately narrow: **the instructor-handoff phase only** (not the whole
pipeline). Built so the same bucketing/components can extend to other phases later.

## Which courses count

Courses whose `status` is one of the "ball in the instructor's court, not yet
approved" states:

- `sent_to_instructor`
- `instructor_viewing`
- `instructor_questions`

`instructor_approved` / `final_approved` are **excluded** (already approved).

## Key metric — "days since sent" (computed correctly)

Derived from the **latest** `course_status_events` row where
`to_status = 'sent_to_instructor'` (its `created_at`), **not** from
`courses.updated_at`. Re-sends after a question round naturally reset the clock,
because we take the most recent send event.

## Buckets

Thresholds live in one constants object (`HANDOFF_THRESHOLDS`) so they can be
tuned later without touching logic — this is the "plan from now onwards" knob.

| Bucket | Rule | Colour |
|---|---|---|
| `fresh` | sent < 3 days ago | green |
| `aging` | sent 3–6 days ago | amber |
| `overdue` | sent 7+ days ago (and not approved) | red |

Cross-cut engagement signals (from `instructor_dashboard_views`, keyed to the
**currently assigned** instructor):

- **never opened** — no views row → "untouched"
- **has questions** — status is `instructor_questions`
- **most urgent** — `overdue` AND never opened

## The two parts

1. **Summary strip (top).** Bucket-count KPI tiles (overdue / aging / fresh /
   never-opened / has-questions) reusing `StatCard`, plus a compact
   per-instructor mini-table (each professor → overdue/aging/fresh counts) so the
   admin sees *who* to nudge.
2. **Bucketed course list (below).** One row per course, overdue first. Columns:
   course title, instructor, days-since-sent (clock), opened dot (`OpenedDot`),
   status badge, link to `/admin/courses/[id]`. Client-side filters by instructor
   and by bucket.

## Placement

A new section on `/admin/stats`, below the existing charts / stuck-courses list.
Same auth gate as the rest of the page (`admin_full`, `admin_viewer`,
`super_admin`).

## Architecture (modular MVC)

**Model (data access)**
- `contracts.ts`: new `InstructorHandoffCourse` row type; add
  `listInstructorHandoffCourses()` to the `CourseRepository` interface.
- `postgres/course-repository.ts`: one SQL query — `courses` filtered to the 3
  statuses, lateral-joined to the assigned instructor, lateral-joined to the
  latest `sent_to_instructor` event for `sent_at`, left-joined to
  `instructor_dashboard_views` (on the current instructor's `profile_id`) for
  `first_opened_at` / `last_opened_at` / `open_count`.

**Pure logic (unit-tested, no DB, no `server-only`)**
- `lib/admin/handoff-buckets.ts`: `daysSince(iso, now)`, `bucketForDays(days)`,
  `summarize(items)`, `HANDOFF_THRESHOLDS`, and the bucket/summary types. Pure →
  covered by vitest.

**Query wrapper (server-only)**
- `lib/admin/queries.ts`: `getInstructorHandoffData()` → calls the repo, classifies
  each row (`daysSinceSent`, `bucket`, `opened`, `hasQuestions`), and returns
  `{ courses, summary, byInstructor }`.

**View**
- `components/admin/handoff/bucket-badge.tsx` — colour/label metadata + pill.
- `components/admin/handoff/handoff-summary.tsx` — KPI tiles + per-instructor table.
- `components/admin/handoff/handoff-course-list.tsx` — `"use client"` filterable list.
- `components/admin/handoff/instructor-handoff-section.tsx` — server wrapper that
  composes the heading + summary + list; the only thing `stats/page.tsx` renders.

## Explicitly deferred (YAGNI)

- Email-nudge action from the overdue bucket.
- TA/admin open tracking (only instructor opens exist today).
- DB/settings-configurable thresholds (constants are enough for now).
- Extending buckets to the TA-review / staging phases (v2, same components).

## Testing

- Unit: `lib/admin/__tests__/handoff-buckets.test.ts` covering day math, bucket
  boundaries (2/3/6/7-day edges), and summary aggregation incl. empty input.
- Verification: `npm --workspace @coursebridge/web run test` and
  `npm --workspace @coursebridge/web run typecheck`.
