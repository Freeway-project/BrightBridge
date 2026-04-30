# AGENTS.md — CourseBridge Coding Agent Instructions

## Project

CourseBridge is a Next.js + Supabase workflow platform for Moodle to Brightspace course migration review.

## Important Rule

Do not build large features without explicit instruction. Work in small, focused tasks.

## Tech Stack

- Turborepo
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Postgres/Auth/Realtime
- Cloudflare R2 for storage
- Vercel deployment

## Coding Guidelines

- Use TypeScript.
- Prefer clear, boring, maintainable code.
- Keep business logic outside UI components when possible.
- Use shared packages for workflow, auth, validation, and storage logic.
- Do not hardcode workflow status strings across the app.
- Prefer constants/enums for roles and statuses.
- Do not store files or base64 data in Postgres.
- Do not introduce new dependencies without reason.
- Do not change unrelated files.
- **SECURITY & ROLES:** When dealing with access control, roles, or database queries, you MUST consult `docs/rbac-architecture.md`. Enforce access at the application layer (PBAC) instead of relying solely on Supabase RLS.

## Initial Monorepo Direction

Expected structure:

apps/web
packages/workflow
packages/auth
packages/validation
packages/storage
packages/ui
packages/config
docs

## Current Phase Status

- **Phase 0 (Foundation):** COMPLETE — Turborepo, Next.js 16, Tailwind 4, shadcn/ui, Supabase SSR
- **Phase 1 (Workflow Spine):** COMPLETE — `packages/workflow` fully implemented
  - `roles.ts`: 5 roles (ta, admin, communications, instructor, super_admin)
  - `statuses.ts`: 10 course statuses with label/visibility helpers
  - `transitions.ts`: 11 valid transitions with role-based guards
  - `index.ts`: clean public API exporting all of the above
- **Phase 2 (Data Model Draft):** COMPLETE — schema documented in `docs/data-model.md`
  - Tables: profiles, courses, course_assignments, course_status_events, review_sections, review_responses, course_comments, review_invites
- **Phase 3 (Initial Supabase Schema):** NEXT — write SQL migrations based on the data model

## Next Task

Write Supabase migration files for the data model defined in `docs/data-model.md`. Start with the core tables: `profiles`, `courses`, `course_assignments`. Do not add RLS policies or seed data yet — schema only.

Do not implement the full database, auth, PDF generation, notifications, or R2 until requested.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
