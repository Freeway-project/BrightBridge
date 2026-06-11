# Instructor Dashboard — Supabase build + Postgres port log

This doc is the durable memory for instructor-dashboard work. Per `CLAUDE.md`,
this workspace uses **repo docs, not AI-side memory** — so everything an agent
needs to replay this work on the other lineage lives here, in git.

## The two lineages

| | **Here — Supabase (prod)** | **There — Postgres / Azure** |
|---|---|---|
| Branch | `main` (live) → feature branch `feat/instructor-dash-supabase` | PR #142 head `ft-azure-main-sync` |
| App path | `apps/web/...` | `SOURCE/apps/web/...` (also untracked locally under `CourseBridge/SOURCE/`) |
| Auth | Supabase Auth | Azure OIDC only |
| Data access | Supabase client (`@supabase/...`) | direct `pg` pool |
| Deploy | PM2 `brightbridge` + `brightbridge-autodeploy` (polls `origin/main` every 60s → `deploy.sh`) | Azure pipelines / `vps-stack/` |

> **Do not merge PR #142 casually.** It is a full stack migration (758 files,
> removes Supabase). The autodeploy watcher would auto-roll it to prod on merge.
> Instructor work here stays on Supabase until explicitly cut over.

## Workflow

1. Build instructor-dashboard changes on `feat/instructor-dash-supabase` (off `main`).
2. Keep commits **separated by concern**:
   - `ui:` UI / layout / components — these port **cleanly**.
   - `data:` anything querying data via Supabase client — these need a **`pg` rewrite** on the Postgres side.
3. Deploy to Supabase prod the normal way (merge to `main`; autodeploy picks it up).

## Replaying onto the Postgres side (`ft-azure-main-sync`)

Same files, shifted under `SOURCE/`. From this branch:

```bash
git format-patch main..feat/instructor-dash-supabase --stdout \
  | git apply --directory=SOURCE        # run on ft-azure-main-sync
```

- `ui:` commits apply untouched.
- `data:` commits will conflict / need manual rewrite from Supabase client → `pg` pool. Re-implement the query, keep the same function signature where possible.

## Relevant existing locations (Supabase / main)

- `apps/web/app/(dashboard)/instructor` — instructor routes
- `apps/web/components/instructor` — instructor UI components

## Change log (fill in per commit as we build)

### Feature: hierarchy delegation + on-behalf-of audit + identity

Leaders (dean/dept-head/etc.) can act on instructor courses on the assigned
instructor's behalf; every action records who-on-whose-behalf; activity shows
absolute date+time; conversation authors show their org title + on-behalf line.

| File | Type | Ports clean? | pg note |
|------|------|--------------|---------|
| `supabase/migrations/20260611000000_delegated_on_behalf_of.sql` | data | **NO** | Re-author as a pg migration: 3 nullable `acting_on_behalf_of` FK columns on course_status_events, course_comments, course_issue_comments. |
| `lib/repositories/supabase/course-repository.ts` | data | **NO** | Supabase `.select()` FK-hint embed `profiles!..._acting_on_behalf_of_fkey`; rewrite as `pg` JOIN. `getAdminCourse` now also extracts the instructor assignment. |
| `lib/repositories/supabase/comment-repository.ts` | data | **NO** | `acting_on_behalf_of` added to insert; `*` carries it back. Rewrite insert for pg. |
| `lib/courses/service.ts` | data | ~clean | `resolveDelegationContext` + relaxed `assertCanActOnCourse`; uses repo abstractions, no raw SQL. |
| `lib/hierarchy/leadership.ts` | data | clean | New: realigned `LEADERSHIP_TITLES` (dropped `chair`, added `vp`/`associate_dean`), `highestLeadershipTitle`, `resolveLeaderTitleMap`. |
| `lib/services/comments.ts`, `lib/actions/shared-comment-actions.ts`, `instructor/courses/[id]/actions.ts` | data | clean | Thread `actingOnBehalfOf`; enrich author title + on-behalf name. |
| `lib/repositories/contracts.ts`, `lib/courses/timeline.ts` | data | clean | Types: `acting_on_behalf_of`/`on_behalf_of_name`, `AdminCourseRow.instructor`, timeline `onBehalfOfName`. |
| `instructor/courses/[id]/page.tsx` | ui/server | clean | readOnly gate unlocks delegated leaders. |
| `components/courses/course-timeline.tsx` | ui | clean | On-behalf line + absolute date+time. |
| `components/shared/course-discussion.tsx` | ui | clean | Org-title chip + on-behalf subline + absolute-time tooltip. |
| `components/super-admin/audit-view.tsx` | ui | clean | Actor "→ on behalf of"; date **and** time. |
| `instructor/courses/[id]/_components/instructor-course-shell.tsx` | ui | clean | "Acting as <title> on behalf of <instructor>" banner. |

### Feature: instructor action-first inbox landing

| File | Type | Ports clean? | pg note |
|------|------|--------------|---------|
| `instructor/_components/classify-courses.ts` (+`.test.ts`) | ui | clean | Pure classifier off `isInstructorActionableStatus`. Vitest written; the repo's vitest runner is broken in the dev box (rolldown arm64 + std-env ESM) — logic verified via `tsx`. |
| `instructor/_components/instructor-inbox.tsx` | ui | clean | Hero action cards + collapsible Waiting/Approved groups. |
| `instructor/page.tsx` | ui | clean | Recomposed to the inbox; actionable leadership lane from `departmentCourses`. |
| deleted: `instructor-course-list.tsx`, `department-monitor.tsx`, `dashboard-stats-rail.tsx` | ui | clean | Retired flat list + passive rail. |

> **Not yet done (follow-ups):** issue-thread (`IssueDrawer`) author-title/on-behalf
> enrichment, and on-behalf on a delegated *question* (`instructorRaiseQuestionAction` →
> `createIssueAction`). Status events, sign-off acks, and shared comments are covered.

> **DB migration NOT yet applied** to Supabase — `20260611000000_delegated_on_behalf_of.sql`
> must be applied before the feature works at runtime (the on-behalf reads reference the new
> column + FK). Gated on explicit go-ahead.
