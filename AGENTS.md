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

## First Priority

Set up the project foundation only:
- Next.js app
- Tailwind
- shadcn/ui
- shared packages
- basic dashboard layout
- documentation files

Do not implement the full database, auth, PDF generation, notifications, or R2 until requested.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
