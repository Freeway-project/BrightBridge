# Instructor Dashboard: My Courses / My Department Tabs

**Date:** 2026-06-15
**Branch:** `ft-flatten-monorepo`
**Status:** Design — awaiting review

## Problem

Today the instructor dashboard (`/instructor`) renders two stacked sections separated by an `<hr>`:

1. **Needs your review** — the instructor's own courses.
2. **Your department** — courses across their unit subtree, shown only when `isDeptHead === true` (any leadership title: `vp`, `dean`, `associate_dean`, `assistant_dean`, `dept_head`).

Department heads, deans, and higher-ranked leaders frequently want to swap context between the two views without scrolling. The stacked layout makes "my department" feel like a secondary appendage and buries it below the personal queue.

## Goal

Convert the two stacked sections into two prominent top-level tabs — **My Courses** and **My Department** — at the top of the dashboard content area, for any user with a leadership title. Non-leader instructors see no tabs at all (their view stays identical to today).

## Non-Goals

- Changing the dashboard data shape (`getInstructorDashboardData()` is unchanged).
- Changing routing — no new sub-routes, no URL changes.
- Role-adaptive tab labels ("My Faculty" for deans, etc.). Labels are literal "My Courses" / "My Department".
- Changing the nested per-org-unit tab strip that `InstructorInbox` already builds inside the department view — that behavior is preserved.
- Lazy-loading per tab. Both lists are already server-fetched today; this redesign keeps that.

## Architecture

A thin client-component wrapper around the existing `InstructorInbox`:

```
apps/web/app/(dashboard)/instructor/
├── page.tsx                                    (edit: 1 block swapped)
└── _components/
    ├── instructor-inbox.tsx                    (unchanged)
    ├── classify-courses.ts                     (unchanged)
    └── instructor-dashboard-tabs.tsx           (NEW — client component)
```

### Data flow

```
page.tsx (server)
  └─ getInstructorDashboardData()  → { myCourses, departmentCourses, isDeptHead }
       └─ <InstructorDashboardTabs ...all three props />   (client)
            ├─ if !isDeptHead → <InstructorInbox courses={myCourses} ... />
            └─ if  isDeptHead → <Tabs defaultValue="my-courses">
                                  <TabsList>
                                    <TabsTrigger value="my-courses">    My Courses    [count] </TabsTrigger>
                                    <TabsTrigger value="my-department"> My Department [count] </TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="my-courses">    <InstructorInbox courses={myCourses} ... /> </TabsContent>
                                  <TabsContent value="my-department"> <InstructorInbox courses={departmentCourses} ... /> </TabsContent>
                                </Tabs>
```

No server-action, no data-layer touch. The single client component is a presentational shell.

## Components

### `InstructorDashboardTabs` (new, client)

**File:** `apps/web/app/(dashboard)/instructor/_components/instructor-dashboard-tabs.tsx`

**Props:**

```ts
type InstructorDashboardTabsProps = {
  myCourses: InstructorCourse[];
  departmentCourses: CourseSummary[];
  isDeptHead: boolean;
};
```

**Responsibilities:**

- Branch on `isDeptHead`:
  - `false` → render a single `<InstructorInbox courses={myCourses} ... />` with today's heading/subheading/empty-hint/action-verb copy. No tab bar.
  - `true` → render `<Tabs defaultValue="my-courses">` with two triggers and two content panels.
- Pass the existing copy props (`heading`, `subheading`, `emptyHint`, `actionVerb`) to each `InstructorInbox`. These strings live in this component (moved out of `page.tsx`) so the page stays a thin server shell.
- No internal state beyond what `Tabs` (Radix) manages.

### `page.tsx` (edit)

Replace the current body:

```tsx
<div className="mx-auto max-w-3xl space-y-10">
  <InstructorInbox courses={myCourses} heading="Needs your review" ... />
  {isDeptHead && (
    <>
      <hr className="border-border/40" />
      <InstructorInbox courses={departmentCourses} heading="Your department" ... />
    </>
  )}
</div>
```

with:

```tsx
<div className="mx-auto max-w-3xl">
  <InstructorDashboardTabs
    myCourses={myCourses}
    departmentCourses={departmentCourses}
    isDeptHead={isDeptHead}
  />
</div>
```

The `<Topbar title="My Course Reviews" />` and `<TweakableContent ...>` wrapper stay as-is.

## UI behavior

- **Default tab:** `My Courses`.
- **Tab labels:** literal "My Courses" and "My Department" (no role-adaptive copy).
- **Count badges:** small muted pill inside each `TabsTrigger` showing `myCourses.length` / `departmentCourses.length`. Hidden when count is 0.
- **Layout:** `<TabsList className="grid w-full grid-cols-2">` so both triggers are equal-width and visually prominent. Each `TabsTrigger` uses larger padding (`px-6 py-3`, `text-base font-semibold`) to satisfy "big tabs".
- **Active state:** inherited from the shadcn `Tabs` primitive — no custom active styling. Matches `admin-tabs.tsx` and `super-admin-tabs.tsx` visually.
- **Nested dept tab strip:** the dept-tab UI that `InstructorInbox` already builds when courses carry `orgUnitName` is preserved — it renders inside the "My Department" content panel exactly as it does today.
- **Non-leader users:** the tab bar is not rendered. The page looks identical to today's single-section view for them. No empty "My Department" tab.

## Accessibility

- Radix-backed shadcn `Tabs` provides keyboard navigation (←/→ between tabs, Home/End to jump), `role="tablist"`, `aria-selected`, and proper `aria-controls`/`aria-labelledby` wiring out of the box.
- Count badges are decorative; they are appended after the visible label so screen readers announce e.g. "My Courses, 5".
- The existing `instructor-surface` wrapper (which enlarges instructor-scoped controls) remains in effect.

## Testing

- **No new unit tests for `InstructorDashboardTabs`.** It's a thin presentational shell; the substantive logic lives in the already-tested `InstructorInbox` + `classify-courses`.
- **Existing tests unaffected.** No data-layer or repository changes.
- **Manual verification:** dev-server smoke test for three user shapes:
  1. Plain instructor (no leadership title) — sees single section, no tab bar.
  2. Dept head — sees both tabs, "My Courses" active by default, counts correct.
  3. Dean with multiple units — sees both tabs; switching to "My Department" reveals the nested per-org-unit tab strip.

## Risks & rollback

- **Risk:** trivial — a presentational swap with no data or routing changes. The blast radius is the `/instructor` index page only. Course detail pages (`/instructor/courses/[id]`) are untouched.
- **Rollback:** revert the two-file change. No migrations, no flags.

## Out-of-scope follow-ups

- Lazy data fetch per tab (only useful if `departmentCourses` becomes large enough to matter).
- Persisting last-active tab to local storage or URL hash.
- Role-adaptive copy ("My Faculty" / "My Division").
- A standalone `/instructor/department` route for direct linking.
