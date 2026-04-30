# GEMINI.md — CourseBridge Coding Agent Instructions

## Project

CourseBridge is a Next.js + Supabase workflow platform for Moodle to Brightspace course migration review.

## Important Rule

Do not build large features without explicit instruction. Work in small, focused tasks. Do not modify unrelated files.

## Tech Stack

- Turborepo monorepo
- Next.js App Router (v16)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- React Hook Form + Zod (for forms)
- Supabase Postgres / Auth / Realtime
- Cloudflare R2 for file storage
- Vercel deployment
- Sentry for error monitoring

## Coding Guidelines

- Use TypeScript everywhere.
- Prefer clear, boring, maintainable code over clever code.
- Keep business logic outside UI components.
- Use shared packages (`packages/workflow`, `packages/auth`, `packages/validation`, `packages/storage`) for shared logic.
- Do not hardcode workflow status strings — use constants/enums from `packages/workflow`.
- Do not store files or base64 data in Postgres — use Cloudflare R2 for files, store metadata in Postgres.
- Do not introduce new dependencies without reason.
- Do not change unrelated files.
- Keep instructor-visible and internal comments separate.

## Monorepo Structure

```
apps/web                    Next.js app
packages/workflow           roles, statuses, transitions, canTransition()
packages/auth               auth helpers (empty, logic lives in apps/web/lib/auth)
packages/validation         Zod schemas (empty, ready to populate)
packages/storage            storage helpers (stub)
packages/ui                 custom component stub
packages/config             shared TS/ESLint config
docs/                       data-model.md, development-plan.md, workflow docs
supabase/migrations/        SQL migration files
scripts/                    dev utilities (seed-dev.mjs, apply-migration.mjs)
graphify-out/               Knowledge graph — read GRAPH_REPORT.md first
```

## Current Phase Status

- **Phase 0 (Foundation):** COMPLETE — Turborepo, Next.js 16, Tailwind 4, shadcn/ui, Supabase SSR
- **Phase 1 (Workflow Spine):** COMPLETE — `packages/workflow` fully implemented
  - `roles.ts`: 5 roles (ta, admin, communications, instructor, super_admin)
  - `statuses.ts`: 10 course statuses with label/visibility helpers
  - `transitions.ts`: 11 valid transitions with role-based guards
- **Phase 2 (Data Model):** COMPLETE — schema documented in `docs/data-model.md`
- **Phase 3 (Supabase Schema + RLS):** COMPLETE — migrations applied, core RLS policies live
- **Phase 4 (TA Review Forms):** IN PROGRESS — branch `ft-ta-review-capture`

## What Is Built (on main)

### Auth
- Supabase SSR client: `apps/web/lib/supabase/{server,client,admin}.ts`
- `getAuthContext()` in `apps/web/lib/auth/context.ts` — returns `anonymous | missing_profile | profile`
- Dev role switcher (bottom-right floating card in dev mode)
- New signups auto-get `ta` role via Postgres trigger

### Routes
```
/                          → redirects to /auth/login
/auth/login                → magic link + dev quick-login
/dashboard                 → reads profile.role → redirects to role dashboard
/(dashboard)/ta            → TA dashboard (mock data)
/(dashboard)/admin         → stub
/(dashboard)/communications → stub
/(dashboard)/instructor    → stub
/(dashboard)/super-admin   → FULL dashboard (real data, 4 tabs)
/(dashboard)/courses/[id]/metadata           → stub
/(dashboard)/courses/[id]/review-matrix      → stub
/(dashboard)/courses/[id]/syllabus-gradebook → stub
/(dashboard)/courses/[id]/issue-log          → stub
/(dashboard)/courses/[id]/submit             → stub
```

### Key Services
- `apps/web/lib/courses/service.ts` — `getAccessibleCourses()`, `createCourse()`, `assignUserToCourse()`, `transitionCourseStatus()`
- `apps/web/lib/super-admin/queries.ts` — `getSuperAdminData()`
- Repository pattern: `getCourseRepository()`, `getCommentRepository()` (decoupled from Supabase)

## Next Task (Phase 4)

Build TA review forms on branch `ft-ta-review-capture`:

1. Add RLS migration for `review_sections` + `review_responses`
2. Build `lib/workspace/schemas.ts` + `lib/workspace/types.ts`
3. Build `lib/workspace/actions.ts` (saveDraft, submitReview server actions)
4. Build workspace layout: `step-nav.tsx`, `review-timer.tsx`, `workspace-layout.tsx`, `info-panel.tsx`
5. Build 5 step forms: metadata → review-matrix → syllabus-gradebook → issue-log → submit-panel
6. Replace TA dashboard mock data with real `getAccessibleCourses()`

For full context read `CONTEXT.md` — it is the authoritative handoff document.

## graphify Knowledge Graph

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- God nodes (most-connected core abstractions): `Select()`, `requireProfile()`, `getCourseRepository()`, `getAuthContext()`, `createAdminClient()`
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grepping raw files
- After modifying code files in a session, run `graphify update .` to keep the graph current (AST-only, no API cost)
- The graph has 391 nodes, 512 edges, 23 communities — community map is in GRAPH_REPORT.md
