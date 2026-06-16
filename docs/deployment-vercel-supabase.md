# Vercel + Supabase Deployment Guide

## Overview

```
Supabase (Postgres DB) ←→ Vercel (Next.js app)
```

The app uses Supabase only as a managed Postgres host. Auth is handled by the
app's own cookie-based system — no Supabase Auth, no RLS, no client SDK needed.

---

## Step 1 — Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) → **New project**
2. Choose a region that matches your Vercel deployment (e.g. `us-west-1` for Oregon)
3. Set a strong database password — **save it now**, you need it in every URL below
4. Wait ~2 minutes for provisioning to finish

---

## Step 2 — Get Your Connection Strings

Go to **Supabase Dashboard → Project Settings → Database → Connection string**.

You need two URLs:

| Use | Mode | Port | Where to find it |
|-----|------|------|-----------------|
| Running migrations (from your laptop) | Session pooler | `5432` | Connection pooling → Session mode |
| App runtime on Vercel | Transaction pooler | `6543` | Connection pooling → Transaction mode |

Both look like:
```
postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-1-us-west-2.pooler.supabase.com:[PORT]/postgres
```

> **Note:** The direct host `db.[ref].supabase.co:5432` may be IPv6-only and unreachable
> from some dev machines. Use the pooler URLs above for everything.

---

## Step 3 — Run Migrations

From the **repo root**, run all 40+ migrations in order against the **Session pooler URL** (port 5432):

```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres" \
  node scripts/db-migrate-all.mjs
```

Expected output: one `Applied migration:` line per file (~40), then exits cleanly.

The migration stack is self-contained:
- `auth_compat.sql` — safely skips on Supabase (real auth schema already exists)
- `postgres_compat.sql` — drops the `auth.users` FK (app uses its own auth, not Supabase Auth)
- Monitoring migration — skipped automatically

If you see `Pre-existing schema detected` it means some tables already exist — that is safe,
the script will record all migrations as applied and skip them.

---

## Step 4 — Create the First Super Admin User

Run this once against the **Session pooler URL** to seed the first account.
Replace the values in angle brackets:

```bash
node -e "
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);
const pg = require('pg');

(async () => {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync('<YOUR-PASSWORD>', salt, 64);
  const passwordHash = salt + ':' + hash.toString('hex');
  const id = require('crypto').randomUUID();

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query(
    \`INSERT INTO profiles (id, email, full_name, role, password_hash)
     VALUES (\$1, \$2, \$3, 'super_admin', \$4)\`,
    [id, '<YOUR-EMAIL>', '<YOUR-NAME>', passwordHash]
  );
  await client.end();
  console.log('Super admin created:', '<YOUR-EMAIL>');
})();
" 
```

Run it with:
```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres" \
  node -e "..."
```

After this you can log in at `/auth/login` and create additional users from the Admin panel.

---

## Step 5 — Deploy to Vercel

### 5a — Import the repo

1. [vercel.com](https://vercel.com) → **Add New Project** → Import `Freeway-project/BrightBridge`
2. Set **Root Directory** to `apps/web`
3. Framework preset: **Next.js** (auto-detected)

### 5b — Set environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

```bash
# Database — Transaction pooler (port 6543) for serverless
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres
PG_POOL_MAX=2

# Optional deployment version metadata
# Set one of these from the current commit SHA if you want deploy/version visibility in-app
GIT_COMMIT_SHA=<your commit sha>
# or NEXT_PUBLIC_GIT_COMMIT_SHA=<your commit sha>
# or NEXT_PUBLIC_APP_VERSION=<release tag or build id>

# Auth
SESSION_SECRET=<run: openssl rand -base64 32>
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<run: openssl rand -base64 32>

# App URL (your Vercel domain or custom domain)
# Required for exported instructor invite links used in manual mail merge
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Optional: Sentry error tracking
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=   # CI/CD only — add to Vercel env, not repo

# Optional: AI content converter
ANTHROPIC_API_KEY=

# Optional: MindFresh refresh API
GROQ_API_KEY=

# Optional: Meme icebreaker
NEXT_PUBLIC_RAPIDAPI_KEY=

# Optional: Chat feature flag
NEXT_PUBLIC_CHAT_ENABLED=false

# Optional: Maintenance override / migration banner forcing
NEXT_PUBLIC_FORCE_MAINTENANCE=false

# Optional: Protect /api/metrics with a bearer token
METRICS_BEARER_TOKEN=

# Leave blank in production (dev-only bypass)
ENABLE_DEV_LOGIN=
NEXT_PUBLIC_ENABLE_DEV_LOGIN=
```

> `SESSION_SECRET` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must stay **stable**
> across deployments — rotating them invalidates all active user sessions.

### 5c — Deploy

Click **Deploy**. First build takes ~2–3 minutes.

---

## Step 6 — Verify

1. Visit `https://your-app.vercel.app/auth/login`
2. Sign in with the super admin credentials from Step 4
3. Go to **Admin → Users** and confirm profiles load
4. Open a course in **Ready for Instructor**, use **Send to Instructor + CSV**, and confirm the downloaded CSV contains instructor emails and invite links for manual mail merge

---

## Ongoing: Applying New Migrations

Whenever a new file is added to `db/migrations/`, run the migrate script against the
**Session pooler URL** (port 5432). The script is idempotent — already-applied
migrations are skipped.

```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres" \
  node scripts/db-migrate-all.mjs
```

## Ongoing: Database Backups

Use the existing backup script (works with either pooler URL):

```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres" \
  bash scripts/backup-prod-db.sh
```

Backups land in `backups/` as `.dump` files. Keep at least 2 recent backups before
any migration run.
