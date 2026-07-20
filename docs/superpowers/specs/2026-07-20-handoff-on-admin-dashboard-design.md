# Instructor Handoff Staleness on the /admin Dashboard — Design

**Date:** 2026-07-20
**Branch:** `ft-handoff-on-dashboard` (off master)
**Status:** Approved by user (conversation, 2026-07-20)

## Problem

The instructor handoff tracker (PR #201) buckets sent-to-instructor courses into
fresh (<3 days), aging (3–6 days), and overdue (7+ days), with a per-instructor
rollup — but it renders only at the bottom of `/admin/stats`. Admins work the
sent-to-instructor pipeline on the main `/admin` dashboard (Send to Instructors
tab, All Courses board), where none of this staleness signal is visible.

## Goal

Surface the existing buckets and per-instructor breakdown where the work
happens:

1. **Send to Instructors tab** — full treatment: KPI cards + by-instructor
   rollup above the existing sent-courses table, plus a staleness column in
   that table.
2. **All Courses board** — lightweight day-count badges on cards in the three
   instructor-phase columns.

`/admin/stats` keeps its existing tracker section unchanged (user chose "keep
in both places"). No new thresholds, no new SQL.

## Non-goals

- No changes to bucket thresholds or bucketing logic (`handoff-buckets.ts`).
- No new repository queries; reuse `listInstructorHandoffCourses()`.
- No click-to-filter interactions between the rollup table and the course
  table (YAGNI; revisit if asked).
- No changes to the instructor-facing dashboard (that is PR #204's territory —
  see Risks).

## Design

### Data flow

- `apps/web/app/(dashboard)/admin/page.tsx` adds `getInstructorHandoffData()`
  (`apps/web/lib/admin/queries.ts:263`) to its existing `Promise.allSettled`
  batch.
- A new pure helper `apps/web/lib/admin/handoff-lookup.ts` maps
  the handoff result to a per-course lookup:
  `Map<courseId, { daysSinceSent: number | null, bucket: HandoffBucket, opened: boolean }>`.
  Pure function, no DB, unit-testable — mirrors `handoff-buckets.ts` style.
- Props flow: `summary` + `byInstructor` → Send tab; lookup map → sent-courses
  table and board cards.

### Error handling

If `getInstructorHandoffData()` rejects, the dashboard renders exactly as it
does today — no KPI section, no staleness column, no board badges, no crash.
Same isolation pattern as the course-chat inbox fix (PR #202): the failed
promise resolves to `null` and every consumer treats `null` as "feature
absent".

### Send to Instructors tab

- Render the existing `HandoffSummary` component
  (`apps/web/components/admin/handoff/handoff-summary.tsx` — KPI StatCards +
  "By Instructor" table) above the sent-courses table. It is already separate
  from the course list, so nothing is listed twice.
- `sent-courses-table.tsx` gains one **"Sent"** column showing days-since-sent
  with bucket coloring, reusing `BucketBadge` / `BUCKET_META`
  (`components/admin/handoff/bucket-badge.tsx`): red warning for overdue,
  orange for aging, green for fresh.
- **`instructor_approved` wrinkle:** the sent table lists 4 instructor-phase
  statuses; the tracker deliberately excludes `instructor_approved`
  (course-repository.ts:93). Approved rows are absent from the lookup map and
  render "—" in the Sent column (staleness stops mattering once approved).
  Courses missing from the map for any other reason also render "—".

### All Courses board

- Card shape built in `page.tsx:144-151` gains optional
  `daysSinceSent`/`bucket` fields from the lookup map.
- `courses-board.tsx` `BoardCardItem` renders a small day-count chip (e.g.
  "9d") colored by `BUCKET_META` when the fields are present. Only cards in
  `sent_to_instructor`, `instructor_viewing`, `instructor_questions` columns
  will have them; all other cards unchanged.

### Modularity (per user's MVC preference)

- Model/domain: `lib/admin/handoff-lookup.ts` (new, pure).
- Controller/query: one-line addition to the page's query batch.
- View: small, contained edits to `handoff-summary` placement,
  `sent-courses-table.tsx`, `courses-board.tsx`. No fat files.

## Testing

- New unit tests for `handoff-lookup.ts`: builds correct map; approved/missing
  courses yield no entry; null `daysSinceSent` handled.
- Existing `handoff-buckets` tests remain the source of truth for thresholds.
- Component behavior: follow existing test patterns in the repo where present;
  otherwise rely on the unit layer + manual verification of the tab and board.
- **Known baseline:** master already has 3 pre-existing failures in
  `classify-courses.test.ts` (noted 2026-07-20, unrelated to this work). Green
  bar = no *new* failures.

## Risks / open items

- **PR #204 (open):** instructor-facing dashboard banner also reuses the 3/7
  day thresholds from `handoff-buckets.ts`. This design only reads that module
  and does not modify it, so merge order should not matter — but rebase after
  #204 lands and re-run the handoff tests.
- Live DB currently has 0 courses (post-migration), so the section renders
  empty in production until data arrives — same as the stats page today.

## Success criteria

1. Send to Instructors tab shows KPI cards, by-instructor rollup, and a Sent
   staleness column; approved rows show "—".
2. Board cards in instructor-phase columns show colored day-count chips.
3. `/admin/stats` unchanged.
4. Handoff query failure leaves the dashboard fully functional.
5. Test suite: no new failures.
