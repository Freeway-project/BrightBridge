# Rollout: Two-way staff decision from `staging_in_progress` + bulk staging reset

**Date:** 2026-06-05
**Author:** Harshksaw (with Claude Code)
**Environment:** Production — Supabase project `bzejhpkyykswlfwnhrgr`

---

## 1. Summary

Two changes shipped together:

1. **Workflow change** — the assigned staff member (TA / `standard_user`) now gets a
   two-way decision out of `staging_in_progress`:
   - **Mark Ready for Instructor** → `ready_for_instructor` (existing path; an admin
     then sends to the instructor).
   - **Mark Provision Complete** → `final_approved`, **skipping instructor review
     entirely**, with optional instructor notes.
2. **Bulk data reset** — every course in the staging phase was collapsed into a single
   `staging_in_progress` column so staff make that decision per course.

> The admin-only gate after `ready_for_instructor` already existed
> (`ready_for_instructor → sent_to_instructor` is admin-only), so no change was needed there.

---

## 2. References

| Item | Reference |
|---|---|
| Feature branch | `feat/staging-provision-complete` |
| Commit | `b861df4` (`b861df4fb1bb9967a6b05380e620433a5565de91`) |
| Commit author/time | Harshksaw — 2026-06-05 11:07:56 -0700 (18:07:56 UTC) |
| Pull request | [#113](https://github.com/Freeway-project/BrightBridge/pull/113) — **merged** |
| Migration file | `supabase/migrations/20260605000000_bulk_reset_staging_to_in_progress.sql` |
| Rollback script | `scripts/sql/rollback_staging_reset_20260605.sql` |
| Snapshot table | `public.courses_status_backup_20260605` (2,005 rows) |
| Docs branch (this file) | `docs/staging-provision-rollout` |

### Files changed in `b861df4` (10 files, +357 / −41)

```
apps/web/app/(dashboard)/courses/[id]/_components/submit-panel.tsx   +118
apps/web/app/(dashboard)/courses/[id]/submit/page.tsx                  +7
apps/web/lib/workspace/actions.ts                                    +62
docs/workflow.md                                                      +6
packages/workflow/src/index.ts                                       +2
packages/workflow/src/statuses.test.ts                              +52
packages/workflow/src/statuses.ts                                   +57
packages/workflow/src/transitions.ts                                 +8
scripts/sql/rollback_staging_reset_20260605.sql                     +27 (new)
supabase/migrations/20260605000000_bulk_reset_staging_to_in_progress.sql +59 (new)
```

---

## 3. Timeline (2026-06-05, UTC)

| Time (UTC) | Event |
|---|---|
| 18:07:56 | Pre-commit hook took a **full prod backup**: `backups/prod-full-20260605T180756Z-*.dump` (3.7M, gitignored) |
| 18:07:56 | Commit `b861df4` created on `feat/staging-provision-complete` |
| ~18:08 | Branch pushed → PR [#113](https://github.com/Freeway-project/BrightBridge/pull/113) opened |
| ~18:10 | **Dry-run** of the migration on prod inside `BEGIN … ROLLBACK` — executed cleanly, left zero trace (verified) |
| 18:15:31 | **Migration applied to prod** via Supabase `apply_migration` (name `bulk_reset_staging_to_in_progress`) — 2,005 status events stamped at this instant |
| after | PR #113 **merged** to `main` |

> Note: during the session the autodeploy job force-switched the local working tree to
> `main` (`git checkout -f main && git reset --hard origin/main`). No work was lost — the
> commit was already on the branch and remote.

---

## 4. What the migration did (in one transaction)

Scope: `waiting_on_admin` + `ready_for_instructor` + `admin_changes_requested` → `staging_in_progress`.
Untouched: migration-phase, instructor-phase, and `final_approved`.

1. **Guard** — abort if no `super_admin` profile exists (used as the system actor).
2. **Snapshot** — `CREATE TABLE public.courses_status_backup_20260605` and copy each
   affected course's prior status (for rollback).
3. **Canonical trail** — insert one `course_status_events` row per course
   (`from_status` = old, `to_status = staging_in_progress`, actor = earliest super_admin,
   note = `Bulk reset to staging_in_progress for new staff decision workflow`), because a
   raw bulk UPDATE bypasses the app's `transitionCourseStatus`.
4. **The move** — `UPDATE courses SET status = 'staging_in_progress'` for the scoped rows.
   The `trg_audit_courses` trigger captured before/after JSONB per row in `audit_log`.

---

## 5. Verification (post-apply, prod)

| Check | Result |
|---|---|
| `staging_in_progress` total | **2,289** (284 pre-existing + 2,005 moved) |
| Leftover in old staging statuses | **0** |
| Snapshot rows (`courses_status_backup_20260605`) | **2,005** |
| Canonical `course_status_events` reset rows | **2,005** |
| `audit_log` UPDATE rows captured | **2,005** |

Dry-run (pre-apply) returned identical numbers and persisted nothing.

Full course status distribution after rollout:

| Status | Courses |
|---|--:|
| staging_in_progress | 2,289 |
| course_created | 118 |
| assigned_to_ta | 5 |
| ta_review_in_progress | 2 |

---

## 6. Code change detail

**Workflow (`packages/workflow`)**
- `transitions.ts`: added `staging_in_progress → final_approved` for
  `standard_user`, `super_admin` (mirrors the `ready_for_instructor` branch role set).
  Enforced server-side by `assertCanTransition` via `transitionCourseStatus`.
- `statuses.ts`: new `getStaffAdvanceOptions(status)` returning the two-option fork;
  action union extended with `provision-complete`; `getStaffAdvance()` now delegates to
  the first option (keeps course-card label + domain test stable).

**App (`apps/web`)**
- `lib/workspace/actions.ts`: `markProvisionComplete(courseId, notes?)` — readonly-guarded,
  idempotent; saves optional notes via `saveFinalSummaryNotes` while still in staging,
  then transitions to `final_approved`.
- `courses/[id]/_components/submit-panel.tsx`: second button + confirmation dialog with an
  optional, pre-filled instructor-notes textarea and a "skips instructor review" warning.
- `courses/[id]/submit/page.tsx`: passes current `instructor_summary_notes` into the panel.

**Tests:** workflow package — 37 passing (incl. new transition + `getStaffAdvanceOptions`
cases). `apps/web` typecheck clean.

---

## 7. Rollback

`scripts/sql/rollback_staging_reset_20260605.sql` restores each course to its snapshot
status **only where it is still `staging_in_progress`** — any course a staff member has
since advanced (to `ready_for_instructor` or `final_approved`) is left untouched, so a late
rollback cannot clobber real progress.

```sql
UPDATE public.courses c
SET status = b.old_status, updated_at = now()
FROM public.courses_status_backup_20260605 b
WHERE c.id = b.course_id
  AND c.status = 'staging_in_progress';
```

Disaster fallback: restore the 18:07:56 UTC full dump via
`scripts/restore-db-backup.sh` (to a non-prod URL first).

After confidence is established, the snapshot table can be dropped:
`DROP TABLE IF EXISTS public.courses_status_backup_20260605;`

---

## 8. Notes / follow-ups

- **Dev mirror not run:** `.env.mirror`'s `DEV_DATABASE_URL` is a placeholder, so the
  planned dev-mirror test was substituted with the prod `BEGIN … ROLLBACK` dry-run.
  Configure a real dev URL for future migrations.
- **Permission change:** staff (`standard_user`) can now finalize a course
  (`→ final_approved`) directly, skipping instructor review. Deliberate; confirmation-gated.
- **Deploy:** PR #113 must be deployed (`scripts/deploy.sh`) for the new
  "Mark Provision Complete" button to appear; until then staff see only the existing
  "Mark Ready for Instructor" action on the moved courses.
