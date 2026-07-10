# Local Dev Environment Bootstrap + Docs Security Cleanup

## Context

`docs/dev-guides/` (untracked, generated same day) contains onboarding docs with live
secrets in plaintext and stale architecture claims (Azure OIDC, Resend as the active
email provider) that no longer match the app. Separately, two production database
dumps (`coursebridge-prod-clean-20260619T162750Z.dump`, `prod-full-20260619T044306Z.dump`)
are committed on `master` already, outside the gitignored `backups/` directory.
Rewriting git history is out of scope for today (needs separate coordination); this
spec only stops new leaks.

The actual dev-environment ask: get a working local dev stack (Postgres + app) running
on this VPS, and leave behind a script + Windows-focused README so a teammate (or
Claude, on their machine) can do the same. Teammates will use a **non-sudo** account on
this VPS, so nothing in the flow may require `sudo` beyond one-time `docker` group
membership (already true for the `ubuntu`/`dev`/`runner` accounts on this box).

`package.json` already has `dev:db:up` / `dev:db:migrate` / `dev:db:seed`, and
`scripts/backup-db.sh` / `scripts/restore-db-backup.sh` already implement "pull a fresh
prod backup → restore locally → unlock real accounts with `Dev1234!`". The **only
missing piece is `docker-compose.yml` itself** — referenced but never committed, so
`dev:db:up` currently fails. No local Supabase stack is needed: the app talks to
Postgres directly (`pg`) and only touches Supabase for optional Realtime;
`scripts/seed-demo.mjs` (Supabase Auth Admin API) is legacy and out of scope.

## Non-goals

- Rewriting git history to remove the committed `.dump` files (separate, needs
  coordination — flagged, not actioned here).
- Rotating any exposed secrets (user will handle).
- Standing up local Supabase Auth/Storage/Studio.
- Installing Docker/WSL2 itself on a teammate's Windows machine (documented as a
  prerequisite, not automated).

## Part A — Docs/security cleanup

1. `git rm` the two `.dump` files from the working tree; add `*.dump` and
   `docs/dev-guides/*.pdf` to `.gitignore`.
2. `docs/dev-guides/credentials.md`: replace live secret values with
   "see `.env.local` (not committed)" pointers; drop the Azure OIDC / Resend
   contact-directory rows; describe the current auth model (magic links +
   password login + `ENABLE_DEV_LOGIN` dev bypass) and current email provider
   (Microsoft Graph primary, Resend dormant fallback, noop for local dev).
3. `docs/dev-guides/architecture.md` §6: same OIDC → magic-link/password correction;
   fix the `packages/auth` tree comment ("OIDC stubs" → "auth helpers").

## Part B — Docker + bootstrap script

### `docker-compose.yml` (repo root, new)
Single `postgres` service:
- image `postgres:17-alpine` (matches the version `backup-db.sh`/`restore-db-backup.sh`
  already assume for Docker-based pg_dump/pg_restore fallback)
- `POSTGRES_USER=coursebridge_user`, `POSTGRES_PASSWORD=localdev`,
  `POSTGRES_DB=coursebridge` (matches what every existing script already expects)
- port `5433:5432`, named volume for persistence, `pg_isready` healthcheck

### `scripts/dev-setup.mjs` (new, cross-platform Node — runs identically under WSL2,
Linux, macOS; no bash-only requirement, so nothing Windows-specific to maintain)

Sequence, wired to `npm run dev:setup`:
1. Verify `docker` is on PATH and the daemon is reachable (`docker info`); fail with a
   clear message if not (no sudo fallback attempted — if this fails it's a docker-group
   membership problem, which the README documents as a one-time admin step).
2. `docker compose up -d postgres`; poll the healthcheck until ready (timeout ~60s).
3. Check whether the local DB already has data (`SELECT to_regclass('public.profiles')`).
   - **Empty AND prod credentials available** (`PROD_DATABASE_URL` resolvable via the
     same env-chain `backup-db.sh` already uses): run `backup-db.sh --prod`, then
     `restore-db-backup.sh` against the local container. `RESTORE_DATABASE_URL` is
     hard-pinned to `postgresql://coursebridge_user:localdev@localhost:5433/coursebridge`
     inside this script (never inherited from a broader env), and the two interactive
     confirmations are auto-answered (`RESTORE` / `localhost`) since the target is
     pinned to localhost, not sourced from ambiguous env resolution.
   - **Empty, no prod credentials**: skip restore, print that the DB is schema-only and
     how to get a dump (ask a teammate, or set `PROD_DATABASE_URL`).
   - **Not empty**: skip restore entirely (never clobber existing local data).
4. `dev:db:migrate` (idempotent — catches up any migrations newer than the dump).
5. `dev:db:seed` (`seed-local-postgres.mjs`) — unlocks real showcase accounts with
   `Dev1234!`, only meaningful after a restore; safe/no-op otherwise.
6. Ensure `apps/web/.env.local` exists (copy from `apps/web/.env.example` if missing);
   fill `DATABASE_URL` with the local docker URL and generate `SESSION_SECRET` /
   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (via `crypto.randomBytes(32).toString('base64')`)
   if either is blank. Leaves everything else (Anthropic/Groq/Sentry keys) blank —
   those are feature-specific and not required to boot the app.
7. Print the login instructions (showcase account emails + `Dev1234!`).
8. Exec `npm run dev` (replaces the process — `Ctrl+C` stops everything cleanly).

### `docs/dev-guides/local-dev-setup.md` (new)
Windows-focused (WSL2 + Docker Desktop, WSL2 backend) but applies equally to Linux/macOS
since the orchestrator is Node:
- Prerequisites: Docker Desktop w/ WSL2 backend, Node 20+, Git, and — for this VPS
  specifically — membership in the `docker` group (`sudo usermod -aG docker <user>`,
  one-time, then re-login; nothing after that needs sudo).
- Clone → `npm install` → `npm run dev:setup` → open `http://localhost:3000`.
- Troubleshooting: Docker Desktop not running, port 5433 already bound, no prod
  credentials (expected for brand-new teammates without DB access yet).

### Executed now, on this VPS
Bring the container up, pull a real fresh prod backup, restore, seed, start the app in
the background, and verify with a local curl.

## Verification
- `npm run dev:setup` on this VPS completes end-to-end and `curl localhost:3000`
  returns 200.
- Re-running `npm run dev:setup` a second time does not re-restore (data already
  present) and still starts cleanly (idempotency check).
- `git status` shows the two `.dump` files removed and `.gitignore` updated; no
  real secret values remain in `docs/dev-guides/*.md`.
