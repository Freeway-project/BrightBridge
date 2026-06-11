# Instructor Dashboard — Supabase build + Postgres port log

This doc is the durable memory for instructor-dashboard work. Per `CLAUDE.md`,
this workspace uses **repo docs, not AI-side memory** — so everything an agent
needs to replay this work on the other lineage lives here, in git.

## The two lineages

| | **Here — Supabase (prod)** | **There — Postgres / Azure** |
|---|---|---|
| Branch | `main` (live) → feature branch `feat/instructor-dash-supabase` | PR #142 head `ft-azure-main-sync` |
| App path | `apps/web/...` | `SOURCE/apps/web/...` (also untracked locally under `CourseBridge/SOURCE/`) |
| Auth | Supabase Auth | Azure OIDC only |
| Data access | Supabase client (`@supabase/...`) | direct `pg` pool |
| Deploy | PM2 `brightbridge` + `brightbridge-autodeploy` (polls `origin/main` every 60s → `deploy.sh`) | Azure pipelines / `vps-stack/` |

> **Do not merge PR #142 casually.** It is a full stack migration (758 files,
> removes Supabase). The autodeploy watcher would auto-roll it to prod on merge.
> Instructor work here stays on Supabase until explicitly cut over.

## Workflow

1. Build instructor-dashboard changes on `feat/instructor-dash-supabase` (off `main`).
2. Keep commits **separated by concern**:
   - `ui:` UI / layout / components — these port **cleanly**.
   - `data:` anything querying data via Supabase client — these need a **`pg` rewrite** on the Postgres side.
3. Deploy to Supabase prod the normal way (merge to `main`; autodeploy picks it up).

## Replaying onto the Postgres side (`ft-azure-main-sync`)

Same files, shifted under `SOURCE/`. From this branch:

```bash
git format-patch main..feat/instructor-dash-supabase --stdout \
  | git apply --directory=SOURCE        # run on ft-azure-main-sync
```

- `ui:` commits apply untouched.
- `data:` commits will conflict / need manual rewrite from Supabase client → `pg` pool. Re-implement the query, keep the same function signature where possible.

## Relevant existing locations (Supabase / main)

- `apps/web/app/(dashboard)/instructor` — instructor routes
- `apps/web/components/instructor` — instructor UI components

## Change log (fill in per commit as we build)

| Commit | Type (ui/data) | What | Ports clean? | pg note |
|--------|----------------|------|--------------|---------|
| _(none yet)_ | | | | |
