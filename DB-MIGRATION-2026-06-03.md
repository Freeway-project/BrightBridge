# Production Supabase Project Switch — 2026-06-03

> Working runbook. **No secrets in this file** — they live only in gitignored env
> files (`.env.mirror`, `apps/web/.env.local`).

## Why
Prod Supabase project `zgqepddmqgtoeczwoetx` (us-west-2) hit its **egress cap**.
Cloned all data into a fresh project `bzejhpkyykswlfwnhrgr` (us-west-2) and repoint
the production app to it — temporarily, until the larger planned migration. The old
project is untouched and is the rollback target.

## Source / Target
| Role | Project ref | Region |
|------|-------------|--------|
| Source (prod, read-only) | `zgqepddmqgtoeczwoetx` | us-west-2 |
| Target (new)             | `bzejhpkyykswlfwnhrgr` | us-west-2 |

## What was done
Cloned via `scripts/mirror-to-dev.sh` with `.env.mirror`:
`PROD_DATABASE_URL`→source, `DEV_DATABASE_URL`→target, `MIRROR_INCLUDE_AUTH=1`,
`MIRROR_EXTRA_SCHEMAS=monitoring`. Copied `public` (schema+data), `monitoring`, and
`auth.users`/`auth.identities` (data-only); applied service_role grants + GoTrue repair.

## Bug fixes applied to the mirror tooling during this migration
1. `.env.mirror`: added `MIRROR_EXTRA_SCHEMAS` — an absent key tripped `set -e` and
   the script exited silently before its banner.
2. `scripts/mirror-to-dev.sh` `[4/6]` repair & `[6/6]` grants — stream SQL via **stdin**
   instead of `-f`; the `psql` runs in a Docker container that can't see host file paths.
3. `scripts/mirror-to-dev.sh` `[5/6]` app restore — dropped `--exit-on-error`; ignore the
   benign `schema "public" already exists` collision (public is pre-created with grants in
   `[3/6]`), fail on any other error.
4. `scripts/sql/mirror-post-auth-repair.sql` — `instance_id` now `COALESCE`s to the
   zero-UUID when `auth.instances` is empty (it was setting NULL → would break logins).

## Verified row counts (target, 2026-06-03)
| table | rows | table | rows |
|---|---|---|---|
| courses | 2414 | course_assignments | 4462 |
| profiles | 1157 | review_responses | 5677 |
| course_issues | 847 | course_issue_comments | 997 |
| course_status_events | 9527 | course_comments | 102 |
| course_escalations | 120 | escalation_messages | 130 |
| org_unit_members | 58 | organizational_units | 47 |
| review_sections | 5 | issue_comment_mentions | 0 |
| review_invites | 0 | | |
| **auth.users** | **1157** | **auth.identities** | **1157** |

Integrity: `auth.users` = `auth.identities` = `profiles` = 1157; 0 FK orphans;
0 NULL token columns.

## Cutover (repoint prod) — checklist

**Prereqs (do first):**
- [ ] `instance_id` fix on target (command below) — else logins may fail.
- [ ] New project Dashboard → **Auth → URL Configuration**: Site URL + redirect
      allowlist = prod domain (magic-link invites break otherwise).
- [ ] New project Dashboard → **Realtime** enabled.

**Switch:**
1. `pm2 stop brightbridge-autodeploy`  (prevent an auto-rebuild mid-cutover)
2. Edit `apps/web/.env.local` — set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
   to the **new** project; **comment the old values** above them for rollback. Leave
   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and `NEXT_PUBLIC_RAPIDAPI_KEY` unchanged.
   NOTE: edit `.env.local`, **not** `.env` — `.env.local` wins in Next.js.
3. `bash scripts/deploy.sh --skip-pull`  (`NEXT_PUBLIC_*` are inlined at build time, so a
   rebuild — not a restart — is required)
4. Smoke test: app loads w/ data; existing user can log in; instructor magic-link invite
   works; a realtime status change propagates.
5. (optional) `pm2 start brightbridge-autodeploy` — note it may auto-pull `main` + rebuild.

## Rollback
Uncomment the old `NEXT_PUBLIC_*` + `SUPABASE_SERVICE_ROLE_KEY` + `DATABASE_URL` in
`apps/web/.env.local`, then `bash scripts/deploy.sh --skip-pull`. Old project
`zgqepddmqgtoeczwoetx` still holds all data.

## Post-migration TODO
- **Rotate** the prod DB password (`zgqepddm…`) and the new project's `service_role` key —
  both were pasted into a chat transcript during setup.
- Execute the larger migration this switch is bridging.
