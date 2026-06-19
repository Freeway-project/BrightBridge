# Production DB Cutover Runbook — OLD prod → NEW prod

**Status:** PLAN ONLY — execute during a scheduled downtime window ("when all are off"). Do not run any destructive step until then.

## Goal
Move all live data from the **old** production database to the **new** consolidated production project, then point the Vercel app + `lms.harshsaw.ca` at the new project.

## Project map
| Ref | Region / port | Role | Notes |
| --- | --- | --- | --- |
| `zgqepddmqgtoeczwoetx` | us-west-2 / 5432 | **OLD prod DB (live)** | current `DATABASE_URL`; has the real user/course data |
| `bzejhpkyykswlfwnhrgr` | — | OLD prod realtime only | old `NEXT_PUBLIC_SUPABASE_URL` (split from its DB) |
| `ytmscglilbkmrlstvjhy` | us-east-1 / 6543 (pooler), 5432 (direct) | **NEW prod (target)** | DB + Supabase consolidated in one project (`.env.prod`) |
| `usijcptcubkddpkgervf` | us-east-2 | dev | `.env.mirror` |

Credentials live in `.env.prod` (new) and the active prod env / `.env.mirror` (old). **Never copy secrets into this file or git.**

## Key facts that shape the plan
- **Auth is table-backed** (`public.profiles` + bcrypt `password_hash`, app sessions via `SESSION_SECRET`). The app does **not** use Supabase Auth, so only the **`public`** schema must move — no `auth.users` migration.
- **Realtime is ephemeral** (Supabase Broadcast for chat/notifications). Nothing to migrate; the new app just uses the new project's Supabase URL + keys.
- **App reads only `DATABASE_URL`** at runtime (provider is hardcoded to postgres). `DEV_/PROD_/SOURCE_/TARGET_DATABASE_URL` are script-only.
- **pg_dump must use a session/direct port (5432), NOT the transaction pooler (6543)** — pooler breaks pg_dump (`backup-db.sh` warns about this). If local `pg_dump` < server (PG 17), use the Docker workaround already noted for backups.
- **OLD prod has NO migration-tracking table** (no `schema_migrations`, no `_prisma_migrations`; verified 2026-06-18). So `db:migrate:all` cannot compute a "newer-than" delta after restore — it baselines instead (see Approach). All data corrections therefore have to live in OLD / the dump, never in a post-restore migration run. The 2026-06-18 hierarchy fixes were applied to OLD directly for this reason; they intentionally wrote no `schema_migrations` rows.

## Approach (recommended: full `public` dump → restore → baseline migration tracking)
Brings exact schema + data in one shot. **OLD prod has no `schema_migrations` table** (verified 2026-06-18 — no migration-tracking table of any kind), so the dump carries none. On NEW, `db:migrate:all` finds a pre-existing schema (`profiles` exists) with an empty tracking table and **baselines**: it records every migration file as applied *without running it* (`scripts/db-migrate-all.mjs:101-143`; `CREATE TABLE` statements are not idempotent, so replaying history is deliberately avoided). It therefore does **NOT** apply any data corrections as a delta. Every hierarchy fix must already be present in the dump — which is why the three idempotent fixes were applied **directly to live OLD prod on 2026-06-18** (Health Care Assistant → Health and Social Development; the empty `Pharmacy Technician Department` (Trades) stub removed; orphan-collapse, a no-op on OLD). See `docs/hierarchy-orphan-departments.md`.

---

## Phase 0 — Pre-flight (do BEFORE the window; non-destructive)
1. Confirm NEW prod `ytmscglilbkmrlstvjhy` is the intended target and is empty (or safe to overwrite).
2. Capture a baseline of OLD prod for verification later: row counts per table, and counts for key tables (`profiles`, `courses`, `organizational_units`, `conversations`, `messages`).
3. Take a throwaway **rehearsal**: dump OLD `public` and restore into a scratch DB (or the dev project) to time it and catch issues. Run `db:migrate:all` against the scratch target and smoke-test.
4. Ensure the new Vercel project/env is staged with NEW values from `.env.prod` (DATABASE_URL → `ytmscglilbkmrlstvjhy` pooler :6543; `NEXT_PUBLIC_SUPABASE_URL` + anon/publishable + `SUPABASE_SERVICE_ROLE_KEY` all = `ytmscglilbkmrlstvjhy`) — staged but not yet promoted.
5. Decide rollback window (keep OLD prod intact + read-only for N days).

## Phase 1 — Freeze writes (start of window)
1. Enable maintenance takeover on the **current** deployment: set `NEXT_PUBLIC_FORCE_MAINTENANCE=true` (gated in `apps/web/lib/system-migration.ts`) and redeploy / or flip the flag. Verify users are blocked from writing.
2. Confirm no active sessions are writing (check app + DB activity).

## Phase 2 — Dump OLD prod
1. Dump the `public` schema (schema + data) from OLD prod using a **direct/session (5432)** connection, NOT 6543:
   - `PROD_DATABASE_URL=<old direct 5432 url> ./scripts/backup-db.sh --prod` (custom format), or a plain `pg_dump --schema=public --no-owner --no-privileges -Fc`.
2. Verify the dump file size and that it completed without errors.

## Phase 3 — Restore into NEW prod
1. Restore into the empty NEW prod (`ytmscglilbkmrlstvjhy`) via its **direct/non-pooling 5432** URL (`POSTGRES_URL_NON_POOLING` in `.env.prod`):
   - `pg_restore --no-owner --no-privileges -d <new direct url>` (or `restore-db-backup.sh`).
2. Initialise migration tracking on NEW prod (this **baselines**; it does NOT apply a delta):
   - `DATABASE_URL=<new direct url> npm run db:migrate:all`
   - The runner sees the restored schema (`profiles` exists) with an empty `schema_migrations` and records all migration files as applied **without executing them** (`scripts/db-migrate-all.mjs`). This is correct and intended: the data is already fixed in the dump, and replaying history would fail on already-existing tables and re-create the Pharmacy-Technician dupes. (Equivalent explicit form: `MIGRATION_BASELINE_ON_EXISTING=1 DATABASE_URL=<new direct url> npm run db:migrate:all`.)

### Alternative (data-only, if NEW prod schema already built)
Use the existing FK-aware copier instead of dump/restore:
`SOURCE_DATABASE_URL=<old> TARGET_DATABASE_URL=<new> TRUNCATE=true node scripts/sync-supabase.mjs`
Because OLD prod already carries the 2026-06-18 hierarchy fixes, the copied data is already correct — no post-copy migration is required. (Only if copying from an *unfixed* source would you re-apply the three idempotent fixes — `20260617000002`, `20260618000000`, `20260618000001` — to NEW by hand.) Prefer the dump/restore path for a one-time cutover.

## Phase 4 — Verify NEW prod
1. Compare row counts vs the Phase-0 baseline — they should match **exactly**. The hierarchy fixes were applied to OLD *before* the dump (2026-06-18), so the baseline already reflects them and nothing changes during restore/baseline.
2. Spot-check the org hierarchy against the corrected OLD prod: ECE and Health Care Assistant both under **Health and Social Development**; Trades & Apprenticeship holds only its four trades (Construction, Mechanical Building, Motor Vehicle, Welding); the real pharmacy program is **Pharmacy Technician** (13 courses) under Health and Social Development; and **no** `Pharmacy Technician Department` stub remains anywhere. Also confirm a known user looks up and the courses count matches.
3. Smoke-test the app against NEW prod from a preview deployment: login, load chat, load a course.

## Phase 5 — Cut over
1. Point production env at NEW prod: set Vercel prod `DATABASE_URL` + the three Supabase vars to the `ytmscglilbkmrlstvjhy` values, and `NEXT_PUBLIC_SITE_URL=https://lms.harshsaw.ca`.
2. Remove the unnecessary vars: `SUPABASE_URL` (wrong name; app reads `NEXT_PUBLIC_SUPABASE_URL`), `ANTHROPIC_API_KEY`, `DEV_/PROD_/SOURCE_/TARGET_DATABASE_URL`, and (if unused by the deployed branch) `NEXT_PUBLIC_POSTHOG_*` / `NEXT_PUBLIC_RAPIDAPI_KEY` — none are read by master.
3. Promote/redeploy. Confirm `lms.harshsaw.ca` resolves to the new deployment.
4. Set `NEXT_PUBLIC_FORCE_MAINTENANCE=false` and redeploy to lift maintenance.
5. Final smoke test on the live domain.

## Phase 6 — Post-cutover
1. **Rotate all secrets** that have been shared in plaintext: OLD + NEW DB passwords, all `SUPABASE_SERVICE_ROLE_KEY`/anon/publishable keys, `SESSION_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `SENTRY_AUTH_TOKEN`, PostHog/RapidAPI tokens. (Rotating `SESSION_SECRET` logs everyone out — do it during/just after the window.)
2. Keep OLD prod (`zgqepddmqgtoeczwoetx`) read-only as rollback for the agreed window, then decommission.
3. Update `.env.mirror` / docs so OLD refs are clearly retired and `ytmscglilbkmrlstvjhy` is the single prod.

## Rollback
At any point before Phase 5 completes, OLD prod is untouched (we only READ from it). To roll back: revert Vercel prod env to the OLD values, set maintenance off, redeploy. No data loss because the cutover only writes to NEW prod.

## Open items to confirm before executing
- [ ] `ytmscglilbkmrlstvjhy` is empty / safe to overwrite.
- [ ] Direct (5432) connection strings available for OLD and NEW (for dump/restore).
- [ ] Acceptable downtime length (sized from the Phase-0 rehearsal).
- [ ] Decision on whether the NEW prod should also be the realtime project (yes per `.env.prod`) — confirms old `bzejhpkyykswlfwnhrgr` is dropped.
