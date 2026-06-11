# Azure Migration Assessment — "Everything inside Azure"

> **Status:** assessment / planning. No code changed yet.
> **Goal (confirmed):** run the *entire* stack inside our Azure tenant — the Next.js app **and** the data/auth/realtime layer. Keeping Supabase's technology is acceptable as long as it runs in Azure (e.g. self-hosted Supabase containers); we do **not** strictly need vanilla Postgres.
> **Author:** initial draft generated from a full codebase analysis (May 2026).

---

## 1. What we have today (ground truth)

The running system differs from `CLAUDE.md` (which describes the original Vercel/R2 plan). Reality:

| Area | Current state |
|---|---|
| Hosting | Self-hosted **Ubuntu VM + PM2** (`ecosystem.config.cjs`, `scripts/deploy.sh`: git-pull + atomic `.next` swap). **Not** Vercel. |
| Framework | **Next.js 16, React 19, Node 22**, Turborepo + npm workspaces |
| App shape | One app (`apps/web`); `packages/workflow` holds the real state machine; `packages/auth` and `packages/storage` are **empty stubs** (`export {}`) |
| Database | **Supabase Postgres**, 24 SQL migrations in `supabase/migrations/`, applied via `pg` + `DATABASE_URL` |
| Auth | **Supabase Auth** — `signInWithPassword`, `getClaims` (middleware), OAuth callback, `auth.admin.createUser/updateUserById/listUsers` |
| Authorization | **Lives in Postgres RLS** using `auth.uid()` + SQL helpers (`is_admin_role()`, `can_read_course()`, …) |
| Realtime | **Supabase Realtime in active use** — 5 `postgres_changes` channels + presence (`notification-provider.tsx`, `online-presence.ts`) |
| File storage | **Not implemented** (no R2/S3 SDK, no upload routes) |
| Export | ExcelJS (server) + browser-print PDF — **no Puppeteer/Chromium** ✅ |
| External services | Anthropic (content-converter), Groq (mindfresh), Sentry |
| Secrets | `.env.production` / `.env.mirror` are **gitignored** (not committed) ✅ |

**Key insight:** the app is stateless *except* that Supabase provides three platform services it depends on — **Auth, RLS-based authorization, and Realtime**. "Moving to Azure" is really "move the app container" + "bring those three services into Azure."

---

## 2. Recommended target architecture

Because the goal is "everything in Azure" (not "delete all Supabase code"), the lowest-risk path keeps the Supabase *technology* but self-hosts it in Azure:

```
                         Azure tenant
 ┌───────────────────────────────────────────────────────────┐
 │  Azure Container Apps                                       │
 │   • web (Next.js standalone)  ── HTTPS ingress ──► users    │
 │                                                            │
 │  Supabase self-hosted (Container Apps or AKS):             │
 │   • kong/gotrue (Auth)   • postgrest (REST)                │
 │   • realtime             • (studio, optional)              │
 │                                                            │
 │  Azure Database for PostgreSQL – Flexible Server (PG 16)    │
 │   • the actual data  • PgBouncer/built-in pooler           │
 │                                                            │
 │  Azure Key Vault (secrets)   Azure Blob (future file uploads)│
 │  Azure Container Registry (images)  Azure Monitor (logs)    │
 └───────────────────────────────────────────────────────────┘
```

Two viable backend options — **pick one**:

- **Option A — Self-hosted Supabase stack in Azure (recommended for this goal).** Run GoTrue + PostgREST + Realtime containers against Azure PG. **App code barely changes** (Auth/RLS/Realtime keep working). Cost: you now operate those services.
- **Option B — Plain Azure Postgres, drop the Supabase platform.** Requires replacing Auth (Auth.js/Entra), moving authorization out of RLS, and replacing Realtime. **Multi-week rewrite.** Only choose if there's a hard "no Supabase code" mandate — there isn't, per the stated goal.

The rest of this doc assumes **Option A**, and notes where Option B would diverge.

---

## 3. Challenges & blockers

Severity: 🔴 must-fix blocker · 🟡 needs work · 🟢 minor.

### 3.1 App containerization (Container Apps)

| # | Challenge | Sev | Notes / fix |
|---|---|---|---|
| 1 | `next.config.ts` lacks **`output: 'standalone'`** | 🔴 | Required for a slim runnable image; otherwise the image ships all `node_modules`. One-line change + adjust Dockerfile copy. |
| 2 | **No Dockerfile / .dockerignore / compose** | 🔴 | Multi-stage build. Monorepo needs workspace-aware copy — use `turbo prune --scope=@coursebridge/web` to produce a minimal build context. |
| 3 | **`NEXT_PUBLIC_*` are inlined at build time** | 🔴 | They bake into the client bundle during `next build`, so they must be present as **build args**, not runtime env. Per-environment images (or rebuild per env). Classic containerized-Next.js trap. |
| 4 | **PM2 + hardcoded host paths** (`cwd:/mnt/external/...`, `/var/log/pm2`, atomic `.next` swap) | 🟡 | Drop PM2; container runs `node server.js` (standalone). Container Apps handles restart, rolling deploy, scale. Log to stdout → Azure Monitor. |
| 5 | **`.deployment-version` file-watch update detector** | 🟡 | Filesystem-marker logic assumes a long-lived host; meaningless in immutable containers. Replace with `GIT_COMMIT_SHA` baked at build; retire the SSE file-watch feature. |
| 6 | **`sharp`** native binary | 🟡 | Use `node:22-slim` (Debian) base, not Alpine, to avoid libvips/musl issues. |
| 7 | No pinned Node `engines`; TZ hardcoded to America/Los_Angeles in PM2 | 🟢 | Pin Node 22 via base image; set `TZ` via env var. |
| 8 | `content-converter` `maxDuration = 120` | 🟢 | Confirm Container Apps ingress request timeout ≥ 120s. |

### 3.2 Database → Azure Database for PostgreSQL

| # | Challenge | Sev | Notes / fix |
|---|---|---|---|
| 9 | **Schema is ~99% portable** | 🟢 | `pgcrypto`/`gen_random_uuid()`, CHECK constraints, plpgsql triggers, JSONB, recursive view all standard. Enable `pgcrypto` + `pg_stat_statements` via Azure `azure.extensions` server parameter. |
| 10 | **`NULLS NOT DISTINCT`** unique constraint | 🟡 | Requires **PostgreSQL ≥ 15** — provision Flexible Server **PG 16**. |
| 11 | **`auth.users` schema + FK** (`profiles.id → auth.users(id)`) and the `handle_new_user()` trigger | 🟡 (A) / 🔴 (B) | Option A: GoTrue recreates the `auth` schema, so this keeps working. Option B: redesign identity (`profiles` becomes source of truth) and drop the FK. |
| 12 | **Connection pooling** | 🟡 | Supabase gives PgBouncer for free. On Azure use Flexible Server's **built-in PgBouncer** (or a sidecar). Containers are long-lived so it's less acute than serverless, but still required under load. |
| 13 | **Migration runner is ad-hoc** (`apply-migrations.js` hardcodes only 2 files; rest via scripts) | 🟡 | Adopt a real migration tool/flow before cutover (Supabase CLI against Azure PG, or `node-pg-migrate`/Drizzle Kit) so the 24 migrations apply deterministically. |
| 14 | **Data migration & cutover** | 🟡 | `pg_dump` from Supabase → restore to Azure PG. Includes ~1,100 seeded auth users. Plan a maintenance window, dual-write or freeze, and a verification pass (row counts, RLS sanity). |

### 3.3 Auth, RLS, Realtime (the platform-service layer)

| # | Challenge | Sev | Notes / fix |
|---|---|---|---|
| 15 | **Authorization lives in RLS** using `auth.uid()` | 🟡 (A) / 🔴🔴 (B) | Option A: keep RLS as-is (GoTrue sets the JWT → `auth.uid()` works). Option B: this is the single highest-risk item — every policy (`can_read_course`, phase-aware issue rules, etc.) must be re-implemented in the app layer or via `SET LOCAL request.jwt.claims`. A missed policy = data exposure. |
| 16 | **Supabase Auth API surface** (`getClaims`, `exchangeCodeForSession`, `auth.admin.*`) | 🟡 (A) / 🔴 (B) | Option A: self-hosted GoTrue exposes the same API; only `NEXT_PUBLIC_SUPABASE_URL` changes to the in-Azure endpoint. Option B: full replacement (Auth.js / Azure Entra External ID) touching login/signup/middleware + admin user CRUD. |
| 17 | **Realtime** (5 `postgres_changes` channels + presence) | 🟡 (A) / 🔴 (B) | Option A: run the Supabase `realtime` container (needs Postgres logical replication / `wal_level=logical`, configurable on Flexible Server). Option B: replace with `LISTEN/NOTIFY`+WS gateway, Socket.IO, or polling — and note this would make the app **stateful**, complicating horizontal scaling. |
| 18 | **Logical replication prerequisite for Realtime** | 🟡 | Azure Flexible Server supports logical replication but it must be enabled (`wal_level=logical` + replication slots). Required only if self-hosting Supabase Realtime. |

### 3.4 Cross-cutting (networking, secrets, state, ops)

| # | Challenge | Sev | Notes / fix |
|---|---|---|---|
| 19 | **Secrets management** | 🟡 | Move `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, DB URL, Sentry token into **Azure Key Vault**; reference as Container App secrets. Keep build-time `NEXT_PUBLIC_*` separate (see #3). |
| 20 | **Networking / private access** | 🟡 | Put Azure PG on a VNet with private endpoint; Container Apps environment joined to the same VNet. Lock PG firewall to the app subnet, not public. |
| 21 | **Stateless scaling** | 🟢 | The web app holds no local state (sessions are cookies; Realtime is browser→service). Safe to scale to N replicas — *unless* Option B's WS gateway is colocated. |
| 22 | **File uploads (future)** | 🟢 | Not built yet. When added, target **Azure Blob Storage** (the empty `packages/storage` stub is the natural home). |
| 23 | **Observability** | 🟢 | Sentry already external and Azure-friendly. Switch PM2 file logs → stdout; wire Container Apps → Azure Monitor / Log Analytics. Health probe: `GET /api/version`. |
| 24 | **CI/CD** | 🟡 | Current CI only builds. Add: build image → push to **ACR** → deploy to Container Apps (GitHub Actions `azure/container-apps-deploy` or `az containerapp update`). Replaces `scripts/deploy.sh`. |

---

## 4. Effort summary

| Path | Scope | Rough effort | Risk |
|---|---|---|---|
| **Option A** — app containers + self-hosted Supabase in Azure | Dockerize app; stand up GoTrue/PostgREST/Realtime; Azure PG; data migration; wiring | **~1–2 weeks** | Medium (mostly ops) |
| **Option B** — app containers + plain Azure Postgres | All of A's app work **plus** replace Auth, port RLS → app layer, replace Realtime | **~3–5 weeks** | High (authorization rewrite) |

Just the **app containerization** slice (Section 3.1), keeping the current Supabase Cloud backend, is **~1–2 days** and de-risks everything else.

---

## 5. Recommended execution order

1. **Phase 0 — Dockerize the app, keep current backend.** `output:'standalone'`, Dockerfile + `.dockerignore`, `turbo prune` build, ACR, Container Apps, Key Vault secrets, build-time `NEXT_PUBLIC_*`. Ship and validate on Azure *before* touching the database. (~1–2 days)
2. **Phase 1 — Stand up the data layer in Azure.** Provision PG 16 Flexible Server (enable `pgcrypto`, `pg_stat_statements`, `wal_level=logical`, PgBouncer). Apply the 24 migrations via a real runner. Dry-run `pg_dump`/restore.
3. **Phase 2 — Bring up Supabase services in Azure (Option A).** GoTrue + PostgREST + Realtime containers against Azure PG. Point the app's Supabase URL/keys at the in-Azure endpoint.
4. **Phase 3 — Data cutover.** Freeze writes, final dump/restore, verify (row counts, RLS spot-checks, login, realtime), flip DNS/config, decommission Supabase Cloud.
5. **(If Option B instead of 2–4)** Replace Auth, port RLS to app layer, replace Realtime — each behind its own PR with tests.

---

## 6. Open decisions

- [ ] **Option A vs B** — confirm self-hosted Supabase is acceptable, or whether a hard "no Supabase platform" rule forces Option B.
- [ ] **Compute for Supabase services** — Container Apps vs AKS (AKS if running the full Supabase compose is easier to manage as a unit).
- [ ] **Managed alternative** — is **Azure Database for PostgreSQL** acceptable, or is a Postgres **container** required for "everything in containers"? (Managed is strongly recommended for backups/HA.)
- [ ] **Realtime necessity** — if Realtime is "nice to have," dropping it removes the logical-replication + stateful-gateway complexity entirely.
