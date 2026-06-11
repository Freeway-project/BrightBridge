# Design: `ft-azure-main-sync` — Merge Main Features into Azure Branch Structure

**Date:** 2026-06-11  
**Branch to create:** `ft-azure-main-sync`  
**Goal:** Single branch that contains all 133 feature commits from `main` while keeping `ft-AzureMigration` as the structural lead (Azure Pipelines + Docker Swarm deployment layout).

---

## Context

| Branch | State |
|--------|-------|
| `main` | 133 commits ahead of `ft-AzureMigration`; deployed independently via PM2/VPS |
| `ft-AzureMigration` | Frozen at `bc5853214`; the merge base between the two branches; Azure Pipelines CI target |

**Key insight:** `ft-AzureMigration` IS the merge base (`bc5853214`). Both branches already share identical directory structure (`SOURCE/` + `ORCHESTRATION/`). A `git merge main` from azure is a conflict-free fast-forward.

---

## Scope

### What enters `ft-azure-main-sync` from `main`

| Category | Files | Description |
|----------|-------|-------------|
| Lottie animation assets | 29 `assets/*.json` | Celebration overlays used by UI |
| Admin status override | `status-override-dialog.tsx`, `course-status-override.ts`, `.test.ts` | Admin can forcibly move course to any status with reason |
| Notification dismiss | `clear-all-button.tsx`, `notification-row-client.tsx`, `dismiss/route.ts`, `dismiss-all/route.ts` | Per-user notification dismissal |
| DB migrations | `20260610000000_course_status_event_kind.sql`, `20260610000100_dismissed_notifications.sql` | `kind` column on status events + dismissed_notifications table |
| Course export + print | `course-export-data.ts`, `export/route.ts`, `print/courses/page.tsx` | Super-admin Excel/PDF export |
| Workflow package | `transitions.ts` (+`isAdminOverride`), `transitions.test.ts`, `vitest.config.ts` | Admin override helper + test coverage |
| PM2 hardening | `ecosystem.config.cjs` | `NODE_OPTIONS=--unhandled-rejections=warn` prevents crash-loops on transient errors |
| Admin sidebar | `admin-course-sidebar.tsx` | StatusOverrideDialog wired into sidebar |
| Admin actions | `actions.ts` | `overrideCourseStatusAction` server action |
| Docs / specs / plans | ~12 `.md` files | Design docs, deployment guides, migration summaries |
| Vitest root config | `vitest.config.ts`, `vitest-server-only-stub.js` | Root-level test infrastructure |
| Seed script | `scripts/seed-demo.mjs` | Demo data seeding |

### What is intentionally dropped (azure had these, main removed them)

| File | Reason to drop |
|------|----------------|
| `.gitignore` (root) | Redundant — `SOURCE/.gitignore` covers app code; root was cleaned up in main's restructure |
| `SOURCE/apps/web/next-env.d.ts` | Next.js auto-generates this on build; should not be committed |
| `SOURCE/apps/web/lib/courses/tab-utils.ts` | No importers anywhere in either branch — dead code |

### Stale root-level docs to remove (main has them, serve no purpose going forward)

| File | Reason |
|------|--------|
| `AZURE_SYNC_SESSION.md` | One-time migration session notes, no ongoing value |
| `DB-MIGRATION-2026-06-03.md` | Migration runbook already executed |
| `PROD_SUPABASE_SWITCH_RUNBOOK.md` | Migration runbook already executed |

---

## Architecture

No architectural changes. The combined branch is the same repository layout as both parent branches:

```
ft-azure-main-sync/
├── azure-pipelines-coursebridge-prod.yml   # triggers on 'main' in AzDO
├── azure-pipelines-coursebridge-test.yml   # triggers on 'testing' in AzDO
├── ORCHESTRATION/                          # Docker Swarm configs (unchanged)
│   ├── compose-coursebridge-test.yml
│   ├── secrets-coursebridge.sh
│   ├── monitoring/
│   └── ...
└── SOURCE/                                 # App monorepo (main's latest)
    ├── apps/web/                           # Next.js app — all 133 commits of features
    ├── db/migrations/                      # +2 new migrations vs azure
    ├── packages/workflow/                  # +isAdminOverride, +tests
    ├── ecosystem.config.cjs               # +NODE_OPTIONS hardening
    ├── docs/                              # +specs, +plans, +deployment guides
    └── scripts/                           # +seed-demo.mjs
```

---

## Merge Strategy

**Method:** `git merge main --no-ff`

- `--no-ff` preserves the merge topology even though git could fast-forward, making the integration point explicit in history
- Expected conflicts: **zero** (azure = merge base; all changed files were only modified by main)
- The 3 dropped files are auto-resolved by git accepting main's deletions

**Conflict resolution policy** (for documentation — no conflicts expected):
- Code files: take main
- Deployment YAMLs (`azure-pipelines-*.yml`): already identical
- `ecosystem.config.cjs`: take main (has NODE_OPTIONS hardening)

---

## Verification Checklist

1. `git log --oneline ft-AzureMigration..ft-azure-main-sync` shows all 133 commits
2. `git log --oneline ft-azure-main-sync..main` shows 0 commits (no main commit missing)
3. Root `.gitignore`, `next-env.d.ts`, `tab-utils.ts` are absent
4. `SOURCE/` directory structure matches `main` exactly
5. `ORCHESTRATION/` and pipeline YAMLs are present and unchanged
6. `cd SOURCE && npm ci` succeeds
7. `npm run build` in `SOURCE/apps/web` exits 0 (TypeScript clean)
8. `npm test` in `SOURCE/packages/workflow` passes (transitions tests)

---

## AzDO Deployment Notes

The pipeline YAMLs trigger on specific AzDO branch names:
- `azure-pipelines-coursebridge-prod.yml` → triggers on `main`
- `azure-pipelines-coursebridge-test.yml` → triggers on `testing`

To trigger the test pipeline, push `ft-azure-main-sync` to AzDO as the `testing` branch:

```bash
git push azdo ft-azure-main-sync:testing
```

This is a manual step performed by the developer after verifying the local build passes.

---

## Out of Scope

- No changes to `ORCHESTRATION/` deployment configs
- No changes to Azure Pipeline YAML files
- No new features — this is a pure integration branch
- No changes to `main` branch (it stays deployed as-is)
