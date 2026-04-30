# Codex Setup (BrightBridge)

Use this checklist before coding sessions to reduce avoidable Codex/MCP failures.

## 1) Project Hook Setup

This repo includes:

- `.codex/hooks.json`
- `.codex/prehook.sh`

The prehook is fail-safe (`|| true`) and only adds context/warnings. It does not block commands.

## 2) Run Preflight

Run:

```sh
./scripts/codex-preflight.sh
```

What it checks:

- Codex hook files exist and are valid
- Required local commands (`rg`, `node`, `npm`)
- Optional commands (`graphify`, `supabase`)
- Graphify outputs and local env files

`FAIL` means fix now. `WARN` means non-blocking but recommended.

## 3) Recommended Local Setup

Install project dependencies:

```sh
npm install
```

Create env file (one of):

- `.env.local`
- `apps/web/.env.local`

Fill required Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (for migration scripts)

## 4) Session Start Routine

Before bigger tasks:

1. `./scripts/codex-preflight.sh`
2. `npm run typecheck`
3. `npm run build`

If graphify CLI is installed, refresh graph after code edits:

```sh
graphify update .
```
