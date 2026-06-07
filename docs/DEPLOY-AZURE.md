# Azure container deploy contract

The app is containerized by the repo-root `Dockerfile` (multi-stage, `node:22-alpine`)
and is **platform-agnostic** — it runs on Azure Container Apps, AKS, or App Service
for Containers. This document is the contract your Azure pipeline/runtime must honor.
It is intentionally infra-neutral; the Okanagan fork's `CourseBridge/ORCHESTRATION/*`
and `azure-pipelines-*.yml` are Docker-Swarm-on-Oracle specific and are **not** used here.

## Image

```sh
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg NEXT_PUBLIC_AUTH_PROVIDER=azure-oidc \
  --build-arg NEXT_PUBLIC_POSTHOG_KEY=... \
  -t <registry>/brightbridge:<tag> .
```

- The entrypoint runs `node scripts/db-migrate-all.mjs` **before** starting the app,
  then `next start` on port 3000.
- It also maps any `*_FILE` env var (a path to a mounted secret) into the plain env
  var — handy for Docker/K8s secret files.

## Build-time vs runtime env (this is the important part)

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time** — they must
be passed as `--build-arg`, and changing them requires a **rebuild**, not a restart:

| Build args (`--build-arg`) | Runtime env / secrets |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `DB_PROVIDER` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `DATABASE_URL` |
| `NEXT_PUBLIC_AUTH_PROVIDER` | `AUTH_PROVIDER` |
| `NEXT_PUBLIC_POSTHOG_*`, `NEXT_PUBLIC_SENTRY_DSN` | `SESSION_SECRET`, `APP_BASE_URL` |
| `NEXT_PUBLIC_RAPIDAPI_KEY` | `AZURE_OIDC_*` |
| (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` are passed at build only as placeholders so prerender succeeds) | `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (real values), `MIGRATION_BASELINE_ON_EXISTING` |

Full list with explanations: `.env.example`.

## Target-stack runtime values (Postgres + Entra OIDC)

```
DB_PROVIDER=postgres
DATABASE_URL=postgres://coursebridge_user:***@<pg-host>:5432/coursebridge
AUTH_PROVIDER=azure-oidc
SESSION_SECRET=<>=16 char random>
APP_BASE_URL=https://<app-host>
AZURE_OIDC_CLIENT_ID / CLIENT_SECRET / ISSUER / TOKEN_ENDPOINT /
AZURE_OIDC_AUTHORIZATION_ENDPOINT / AZURE_OIDC_REDIRECT_URI=https://<app-host>/auth/callback
```
Build the image with `--build-arg NEXT_PUBLIC_AUTH_PROVIDER=azure-oidc` so the login
page shows the Microsoft button. Store `AZURE_OIDC_*`, `SESSION_SECRET`, `DATABASE_URL`
as runtime secrets (e.g. Azure Key Vault / Container Apps secrets), never as build args.

## Database

- Provision the app role + DB once: `scripts/db-provision.sh` (creates `coursebridge`
  + `coursebridge_user`).
- The entrypoint's `db-migrate-all.mjs` applies `supabase/migrations/*` idempotently
  (tracks `schema_migrations`, strips `supabase_realtime` publication statements on
  plain Postgres, rewrites Supabase roles to `public` when absent).
- For the data cutover from Supabase, see Phase 5 in `docs/` / the migration plan:
  `scripts/migrate-supabase-to-shared-postgres.sh` then
  `scripts/validate-shared-postgres-migration.sh`, with `MIGRATION_BASELINE_ON_EXISTING=true`.

## Azure pipeline outline (your team fills the specifics)

1. `docker build` with the build args above.
2. Push to **Azure Container Registry**.
3. Deploy to **Azure Container Apps / AKS** with the runtime env/secrets above.
4. The container migrates the DB on start (entrypoint), then serves on `:3000`.
