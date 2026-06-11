# Azure Sync — Session Handoff

> Working note for resuming the Azure repo sync. Not committed intentionally (working note).
> Date paused: 2026-06-03.

## Where we are

- **Branch:** `sync/azure-changes` — created off latest `origin/main` (`5c01a70`), clean base.
- **Stashed work:** local dev artifacts are in `git stash` → `stash@{0}`
  ("local dev artifacts before azure-sync branch": .dump, seed-leadership-demo.mjs,
  supabase config/.gitignore, modified migration). Restore later with `git stash pop`
  (or `git stash apply stash@{0}` to keep the stash).
- **Azure reference clone:** was at `/tmp/azure-ref` (shallow clone of
  `https://okanagan.visualstudio.com/DefaultCollection/CourseBridge/_git/CourseBridge`).
  **/tmp may be wiped on reboot — likely needs re-cloning tomorrow.**
  - Re-clone needs the **Azure DevOps PAT again** (NOT stored here for security).
  - **Revoke that PAT** in Azure DevOps once the sync is fully done (it was shared in chat).

## What the Azure repo actually is

Not "a few changes" — a **divergent variant of the whole app**, re-architected for
**self-hosted Azure deployment**. Layout: `SOURCE/` = our repo root; `ORCHESTRATION/` +
`azure-pipelines-*.yml` = deploy wrappers at Azure root. Four themes:

1. **Docker / DevOps deploy** — Dockerfile, .dockerignore, docker-entrypoint.sh, ORCHESTRATION/, pipelines. (additive)
2. **Postgres provider** — swaps Supabase client for direct shared Postgres: `lib/postgres/pool.ts`,
   `lib/repositories/postgres/*`, `lib/repositories/provider.ts` (`DB_PROVIDER=postgres`),
   `*_compat.sql` migrations, `scripts/migrate-supabase-to-shared-postgres.sh`. (architectural)
3. **Azure OIDC / Entra auth** — replaces Supabase Auth: `auth/oidc/login`, cookie sessions,
   Entra app-role mapping (super_admin/admin_full/admin_viewer/standard_user/instructor). (architectural)
4. **App/UI changes** — presence APIs, notification feed, deployment detector, ~80 modified files. (broad)

## Scope of a full mirror (SOURCE/ → repo root, dry-run, local junk excluded)

- **433 add/update**, **27 new files**, **81 deletions**.
- ⚠️ The **81 deletions are OUR features Azure never got** (Azure forked earlier):
  instructor sign-off (`instructor-signoff-dialog.tsx`, `instructor/layout.tsx`),
  sticky tabs (`ui/sticky-tabs.tsx`, `use-sticky-tab-state.ts`),
  print/PDF (`app/print/...`, `lib/exports/xlsx.ts`),
  content converter, instructor invites + email, final-summary editor,
  super-admin course export, and 4 recent migrations
  (staging phases, instructor viewing state, final summary, dashboard query optimization).

## Decision status

- User chose **"Hold — review first"** (did NOT approve applying yet).
- **Recommended path:** *Add/update only — keep our features* (apply Azure's 433 updates + 27 new
  files WITHOUT the 81 deletions, i.e. `rsync` WITHOUT `--delete`). Caveat: some updated files
  reference each other / the new Postgres+OIDC layer, so a reconciliation/build check is needed after.

## Next steps (resume here)

1. Re-clone Azure to `/tmp/azure-ref` if gone (needs PAT again).
2. Review architectural-core diffs before applying — biggest/most entangled files:
   - `apps/web/lib/auth/service.ts` (305), `lib/auth/context.ts` (131) — OIDC pivot
   - `apps/web/lib/courses/service.ts` (45), `lib/repositories/*` — Postgres repo pattern
   - `apps/web/components/providers/notification-provider.tsx` (451), `lib/notifications/queries.ts` (323)
   - `apps/web/lib/issues/actions.ts` (440), `packages/workflow/src/statuses.ts` (75)
3. Decide final apply mode (recommended: add/update-only), then apply + run build/typecheck to reconcile.
4. Bring deploy wrappers too: copy `ORCHESTRATION/` + `azure-pipelines-*.yml` to repo root.

## Safe rsync command (refined excludes — protects local-only artifacts)

```
EXCLUDES=(--exclude='.git/' --exclude='node_modules/' --exclude='.turbo/' --exclude='.next/' \
  --exclude='.vercel/' --exclude='dist/' --exclude='.playwright-mcp/' \
  --exclude='.env.local' --exclude='.env.mirror' --exclude='backups/' --exclude='*.dump' \
  --exclude='.claude/' --exclude='.codex/' --exclude='.gemini/' \
  --exclude='graphify-out/' --exclude='design_handoff/' --exclude='Gate 01*' --exclude='*.csv' \
  --exclude='AGENTS.md' --exclude='CLAUDE.md' --exclude='GEMINI.md' --exclude='CONTEXT.md' \
  --exclude='LLM_CONTEXT.md' --exclude='flow.md')
# add/update only (keep our features): rsync -ai           "${EXCLUDES[@]}" /tmp/azure-ref/SOURCE/ ./
# true full mirror (deletes our features): add --delete to the above
```
