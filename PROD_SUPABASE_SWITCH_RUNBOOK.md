# Prod Supabase Project Switch — Runbook for the prod-VPS agent

> Working note (do NOT commit; do NOT paste secrets into this file).
> Written from the dev box on 2026-06-03. Hand this to the Claude running on the
> production VPS (`/mnt/external/BrightBridge`, pm2 process `brightbridge`).

## Goal

The current Supabase project's **egress is exhausted**. Move all data to a fresh
project and repoint the production deployment to it — temporarily, until the big
migration. Nothing destructive on the old project; it stays as the rollback.

## Projects

| Role | Project ref | Region | Notes |
|------|-------------|--------|-------|
| **Source** (current prod, egress exhausted) | `zgqepddmqgtoeczwoetx` | us-west-2 | read-only here — do NOT switch off until verified |
| **Target** (new) | `bzejhpkyykswlfwnhrgr` | _confirm_ | currently EMPTY |

> Confirm the source ref with the user before running — if the exhausted project
> is actually the dev one (`usijcptcubkddpkgervf`), swap it in below.

## Step 0 — Collect from the NEW project dashboard

From `bzejhpkyykswlfwnhrgr` → Project Settings:
1. **API → Publishable key**: `sb_publishable_xj_1Zi4KAcUiKoAP-SxAUQ_PCA8oy2j` (already known)
2. **API → service_role / Secret key**: `sb_secret_…` (NEEDED)
3. **Database → Connection string → Session mode (port 5432)**: (NEEDED)
   `postgresql://postgres.bzejhpkyykswlfwnhrgr:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres`
   Percent-encode reserved chars in the password (`$`→`%24`, `/`→`%2F`, `)`→`%29`).

Keep these in the shell environment for the commands below — do not write them into this file.

## Step 1 — Clone the data (source → target)

**Recommended: `mirror-to-dev.sh`** — it's purpose-built for project→project and
handles the auth schema safely (full public schema + data, **data-only** restore of
`auth.users`/`auth.identities` so logins keep working, then GoTrue repair + service_role
grants). A plain full `restore-db-backup.sh` of a pg_dump can collide with the new
project's pre-created `auth` schema / GoTrue version — avoid it for a fresh project.

In `.env.mirror` (gitignored) on the VPS, set:
```
PROD_DATABASE_URL=<SOURCE session-mode URL for zgqepddmqgtoeczwoetx>   # already present
DEV_DATABASE_URL=<TARGET session-mode URL for bzejhpkyykswlfwnhrgr>    # the new project
MIRROR_INCLUDE_AUTH=1
```
Then:
```
./scripts/mirror-to-dev.sh        # type "mirror" to confirm; wipes TARGET (it's empty) and loads from source
```
Requires Docker (uses `postgres:17-alpine`; local pg_dump is v16 vs server v17). The
script prints per-table row counts at the end — keep that output.

> Egress note: the mirror does ONE small dump (~2 MB) from the exhausted source — negligible.
> Alternative (zero source egress): the dev box already has a fresh dump at
> `backups/prod-full-20260603T163342Z-846829-933627404.dump`; `scp` it over and use
> `RESTORE_DATABASE_URL=<target> ./scripts/restore-db-backup.sh <file>` — but prefer mirror
> for the auth-schema safety above.

## Step 2 — Verify the clone (before touching prod env)

Point a check at the new project and compare counts to the mirror output / old project:
```
DEV_DATABASE_URL=<target> npm run db:inspect
DEV_DATABASE_URL=<target> npm run check:rls
```
Confirm `profiles`, `courses`, `course_assignments`, `review_responses`, `course_issues`,
`auth.users` are all populated. Do NOT proceed if anything is empty.

## Step 3 — New-project dashboard config (does NOT travel in SQL)

On `bzejhpkyykswlfwnhrgr`:
- **Auth → URL Configuration**: set **Site URL** and the **redirect allow-list** to the
  prod domain (else instructor magic-link invites break).
- **Realtime**: confirm it's enabled (migrations add tables to the publication, but the
  project toggle must be on for live updates / escalations).

## Step 4 — Repoint the VPS env

Edit the VPS's `apps/web/.env` (gitignored — not pulled from git). Set:
```
NEXT_PUBLIC_SUPABASE_URL=https://bzejhpkyykswlfwnhrgr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xj_1Zi4KAcUiKoAP-SxAUQ_PCA8oy2j
SUPABASE_SERVICE_ROLE_KEY=<new project sb_secret_…>
DATABASE_URL=<new project session-mode URL>
```
Keep the OLD values commented above them for instant rollback. Leave Sentry/Resend/
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` unchanged.

## Step 5 — Rebuild + redeploy (REBUILD is required, not just restart)

`NEXT_PUBLIC_*` vars are inlined into the bundle at **build time** — a pm2 restart alone
will keep serving the OLD Supabase URL. You must rebuild:
```
bash scripts/deploy.sh --skip-pull     # rebuilds with new env, atomic .next swap, zero-downtime pm2 reload
```
Use `--skip-pull` if you're only changing env (no code). Drop it to also pull latest `main`.

## Step 6 — Smoke test

- Load the app; confirm data shows (courses/dashboard).
- Log in as an existing user (passwords carried over via hashed `auth.users`).
- Trigger one instructor magic-link invite → confirm the link/redirect works (depends on Step 3).
- Confirm a realtime update (status change / escalation) propagates.

## Rollback

Uncomment the old `NEXT_PUBLIC_*` + `SERVICE_ROLE_KEY` + `DATABASE_URL` in `apps/web/.env`
and re-run `bash scripts/deploy.sh --skip-pull`. The old project (`zgqepddmqgtoeczwoetx`)
is untouched and still has all data.

## State already done on the dev box (FYI, not on the VPS)

- Fresh full backup taken: `backups/prod-full-20260603T163342Z-846829-933627404.dump`
  (auth + all public tables, verified — 588 TOC entries).
- Dev `apps/web/.env` already repointed to the new project URL + publishable key, with the
  service_role key and DATABASE_URL left blank pending the new project's secrets.
