# Docker & Deployment Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip all OIDC/Azure auth vars from Docker and env-template files, wire email+password auth config, and ensure local-dev and prod stacks are consistent with the new auth system.

**Architecture:** Three files change — `vps-stack/compose.yml` (prod stack), `vps-stack/.env.template` (prod env template), and `apps/web/.env.example` (local dev template). No logic changes; only config. Local dev keeps Postgres-only docker-compose as-is.

**Tech Stack:** Docker Compose, Next.js env vars, bash

---

## File Map

| File | Change |
|------|--------|
| `vps-stack/compose.yml` | Remove 11 `AZURE_OIDC_*` + `AUTH_PROVIDER` vars from `web` service; add email vars |
| `vps-stack/.env.template` | Remove OIDC block; add Email section; fix `SESSION_SECRET` inline comment |
| `apps/web/.env.example` | Remove OIDC section (lines 64–76); rename heading to `── Auth ──` |

---

### Task 1: Update `vps-stack/compose.yml` — strip OIDC, add email

**Files:**
- Modify: `vps-stack/compose.yml`

- [ ] **Step 1: Remove OIDC env block and `AUTH_PROVIDER` from the `web` service**

In `vps-stack/compose.yml`, inside `services.web.environment`, delete these lines:

```yaml
      AUTH_PROVIDER: ${AUTH_PROVIDER:-azure-oidc}
      # (keep SESSION_SECRET line — it stays)

      AZURE_OIDC_TENANT_ID: ${AZURE_OIDC_TENANT_ID}
      AZURE_OIDC_CLIENT_ID: ${AZURE_OIDC_CLIENT_ID}
      AZURE_OIDC_CLIENT_SECRET: ${AZURE_OIDC_CLIENT_SECRET}
      AZURE_OIDC_ISSUER: ${AZURE_OIDC_ISSUER}
      AZURE_OIDC_AUTHORIZATION_ENDPOINT: ${AZURE_OIDC_AUTHORIZATION_ENDPOINT}
      AZURE_OIDC_TOKEN_ENDPOINT: ${AZURE_OIDC_TOKEN_ENDPOINT}
      AZURE_OIDC_JWKS_URI: ${AZURE_OIDC_JWKS_URI}
      AZURE_OIDC_REDIRECT_URI: ${AZURE_OIDC_REDIRECT_URI}
      AZURE_OIDC_POST_LOGOUT_REDIRECT_URI: ${AZURE_OIDC_POST_LOGOUT_REDIRECT_URI}
      AZURE_OIDC_SCOPES: ${AZURE_OIDC_SCOPES}
      AZURE_OIDC_ALLOWED_TENANT_ID: ${AZURE_OIDC_ALLOWED_TENANT_ID}
```

- [ ] **Step 2: Add email provider vars to the `web` service**

After the `SESSION_SECRET` line in `services.web.environment`, add:

```yaml
      # ── Email (instructor invite links) ──────────────────────────────────────
      EMAIL_PROVIDER: ${EMAIL_PROVIDER:-noop}
      EMAIL_FROM: ${EMAIL_FROM:-}
      NEXT_PUBLIC_SITE_URL: ${APP_BASE_URL}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      MS_GRAPH_TENANT_ID: ${MS_GRAPH_TENANT_ID:-}
      MS_GRAPH_CLIENT_ID: ${MS_GRAPH_CLIENT_ID:-}
      MS_GRAPH_CLIENT_SECRET: ${MS_GRAPH_CLIENT_SECRET:-}
      MS_GRAPH_SENDER: ${MS_GRAPH_SENDER:-}
```

> Note: `NEXT_PUBLIC_SITE_URL` is derived from `APP_BASE_URL` (already defined) so invite links use the same base URL without a second env var.

- [ ] **Step 3: Verify the compose file is valid YAML**

```bash
docker compose -f vps-stack/compose.yml config --quiet
```

Expected: no errors, exits 0.

- [ ] **Step 4: Commit**

```bash
git add vps-stack/compose.yml
git commit -m "chore(deploy): strip OIDC vars from prod compose, add email provider config"
```

---

### Task 2: Update `vps-stack/.env.template` — remove OIDC block, add email section

**Files:**
- Modify: `vps-stack/.env.template`

- [ ] **Step 1: Remove the `AUTH_PROVIDER` line and entire OIDC block**

Delete these lines from the file:

```
AUTH_PROVIDER=azure-oidc

# --- Azure OIDC (kept; swap later if/when we move off Entra) ---
AZURE_OIDC_TENANT_ID=
AZURE_OIDC_CLIENT_ID=
AZURE_OIDC_CLIENT_SECRET=
AZURE_OIDC_ISSUER=
AZURE_OIDC_AUTHORIZATION_ENDPOINT=
AZURE_OIDC_TOKEN_ENDPOINT=
AZURE_OIDC_JWKS_URI=
AZURE_OIDC_REDIRECT_URI=
AZURE_OIDC_POST_LOGOUT_REDIRECT_URI=
AZURE_OIDC_SCOPES=
AZURE_OIDC_ALLOWED_TENANT_ID=
```

- [ ] **Step 2: Update the `--- App ---` section to show required vars clearly**

Replace the `# --- App ---` section with:

```
# --- App ---
# No trailing slash. Used for invite links and cookie domain.
APP_BASE_URL=
# Generate: openssl rand -base64 32   (keep stable; changing invalidates all sessions)
SESSION_SECRET=
MIGRATION_BASELINE_ON_EXISTING=false
```

- [ ] **Step 3: Add an `--- Email ---` section after `--- App ---`**

Insert after the `--- App ---` block (before `--- Build / runtime secrets ---`):

```
# --- Email (instructor invite links) ---
# Provider: microsoft-graph | resend | noop | auto (default: noop logs to console)
EMAIL_PROVIDER=auto
# Verified sender address, e.g. "CourseBridge <reviews@yourdomain.com>"
EMAIL_FROM=
# Resend (simpler path — get key at resend.com)
RESEND_API_KEY=
# Microsoft Graph (if using an Exchange/M365 mailbox — needs Mail.Send app permission)
MS_GRAPH_TENANT_ID=
MS_GRAPH_CLIENT_ID=
MS_GRAPH_CLIENT_SECRET=
MS_GRAPH_SENDER=
```

- [ ] **Step 4: Commit**

```bash
git add vps-stack/.env.template
git commit -m "chore(deploy): remove OIDC from env template, add email provider section"
```

---

### Task 3: Update `apps/web/.env.example` — remove OIDC section

**Files:**
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Replace the OIDC auth section with a clean email+password section**

Remove lines 64–76 (the `── Auth: Azure OIDC ──` block):

```
# ── Auth: Azure OIDC ─────────────────────────────────────────────────────────
# Required in every environment that does real sign-in. Get values from the
# Entra app registration. SESSION_SECRET signs the local session cookie —
# generate a long random string (>= 32 chars) and keep it stable per env.
SESSION_SECRET=
AZURE_OIDC_CLIENT_ID=
AZURE_OIDC_CLIENT_SECRET=
AZURE_OIDC_TOKEN_ENDPOINT=
AZURE_OIDC_ISSUER=
AZURE_OIDC_JWKS_URI=
AZURE_OIDC_REDIRECT_URI=
AZURE_OIDC_ALLOWED_TENANT_ID=
AZURE_OIDC_POST_LOGOUT_REDIRECT_URI=
```

Replace with:

```
# ── Auth ──────────────────────────────────────────────────────────────────────
# SESSION_SECRET signs the HMAC session cookie.
# Generate: openssl rand -base64 32  (keep stable; rotating invalidates all sessions)
SESSION_SECRET=
```

- [ ] **Step 2: Verify no OIDC vars remain in the file**

```bash
grep -n "OIDC\|AUTH_PROVIDER" apps/web/.env.example
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env.example
git commit -m "chore(env): remove OIDC vars from .env.example, clean auth section"
```

---

### Task 4: Smoke-test local dev stack

**Files:** none (verification only)

- [ ] **Step 1: Start the local Postgres container**

```bash
docker compose up -d
```

Expected: `coursebridge-pg` starts, healthcheck passes within ~10s.

- [ ] **Step 2: Confirm Postgres is reachable on port 5433**

```bash
docker compose ps
```

Expected: `coursebridge-pg` shows `healthy`.

- [ ] **Step 3: Confirm the app can connect (runs migrations)**

```bash
DATABASE_URL=postgresql://coursebridge_user:localdev@localhost:5433/coursebridge \
  node scripts/db-migrate-all.mjs
```

Expected: migrations apply or report "already up to date" — no errors.

- [ ] **Step 4: Confirm no OIDC vars referenced anywhere in compose/template files**

```bash
grep -rn "OIDC\|azure-oidc\|AUTH_PROVIDER" vps-stack/ apps/web/.env.example
```

Expected: no output.

---

### Task 5: Validate prod stack config (dry-run)

**Files:** none (verification only)

- [ ] **Step 1: Dry-run the prod compose with a minimal stub `.env`**

```bash
cd vps-stack
cat > /tmp/cb-test.env <<'EOF'
POSTGRES_PASSWORD=test
SESSION_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
APP_BASE_URL=https://example.com
GRAFANA_ADMIN_PASSWORD=test
METRICS_BEARER_TOKEN=test
COURSEBRIDGE_IMAGE=okanagan/coursebridge:latest
EOF
docker compose --env-file /tmp/cb-test.env config --quiet
```

Expected: YAML resolves cleanly (no "required variable not set" errors), exits 0.

- [ ] **Step 2: Confirm backup sidecar is present and configured**

```bash
docker compose --env-file /tmp/cb-test.env config | grep -A5 "backup:"
```

Expected output contains `prodrigestivill/postgres-backup-local` and `./backups:/backups`.

- [ ] **Step 3: Clean up stub env**

```bash
rm /tmp/cb-test.env
cd ..
```
