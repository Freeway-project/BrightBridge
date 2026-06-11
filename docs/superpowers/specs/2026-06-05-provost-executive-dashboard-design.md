# Provost Executive Dashboard — Design

**Date:** 2026-06-05
**Status:** Approved (design), pending implementation
**Branch:** `feat/provost-executive-dashboard`

## Goal

Turn the Provost experience from a thin reuse of the super-admin `InstitutionPanel`
into a professional, purpose-built **executive dashboard** befitting the highest
role in the institution. Scan-first oversight: at-a-glance health, supporting
detail below, and a clear "who did what" activity stream. Theme-aware (light/dark).

## Current state

- `/provost` ("Provost Overview") and `/provost/org` ("Organization") both render
  the shared `InstitutionPanel` (super-admin/admin component) with two tabs
  (Overview, Organization). No tailored provost experience.
- `getSuperAdminData()` already returns everything needed: `users`, `totalCourses`,
  `statusCounts`, `stuckCourses`, `taWorkload`, **`auditEvents`**, `units`, `members`.
- `AuditView` ("who did what") exists but its page (`/super-admin/audit`) is gated
  to `super_admin` only — the provost cannot currently reach it.
- Provost already has read access to the org chart at `/hierarchy` and org
  management at `/provost/org`.

## Approach

**Approach C — polish the hero, reuse the rest.** Build bespoke, executive-grade
components only for the parts that must look premium (welcome banner + KPI cards),
and reuse existing, working components for status breakdown, at-risk list, and the
audit feed. Lowest effort for the required polish; no reinvention of working code.

(Rejected: A — pure reuse, looks like the super-admin panel, fails the
"professional/highest-role" bar. B — fully bespoke, high effort, re-invents
working components.)

## Layout (`/provost`, top → bottom)

1. **Welcome banner** *(new)* — greets the provost by name (`context.profile.fullName`)
   with a one-line institution summary, e.g.
   *"Welcome, Dr. Smith — 132 courses across 6 colleges · 8 need attention."*
   Professional header card; theme-aware gradient. Counts derived from
   `totalCourses`, `units`, and `stuckCourses.length`.

2. **KPI stat row** *(new — the hero)* — 4–5 executive stat cards derived from
   `statusCounts` + `totalCourses` + `stuckCourses`:
   - Total Courses
   - % Complete / Approved
   - In Progress
   - Stuck / At-Risk (count)
   - Instructor stage (count)
   Clean cards, trend/severity coloring (e.g. at-risk turns amber/red when > 0),
   theme-aware.

3. **Status / phase breakdown** *(reuse)* — courses across workflow phases
   (Migration / Staging / Provision / Instructor). Reuse existing phase-breakdown
   logic (`packages/workflow` `phase-breakdown.ts`) and the super-admin overview
   chart/components.

4. **At-risk courses** *(reuse)* — list from `stuckCourses` (title, status,
   `days_stuck`), the "where are the bottlenecks" section.

5. **Activity feed — "who did what"** *(reuse `AuditView`)* — institution-wide
   stream from `auditEvents`: actor (`actor_name`/`actor_email`/`actor_role`),
   course, from→to status, note, timestamp.

## Components

| Component | Type | Source |
|---|---|---|
| `provost-welcome-banner.tsx` | new | bespoke; props: provost name, summary counts |
| `provost-kpi-row.tsx` | new | bespoke; props: derived KPI values |
| `ProvostDashboard` (compose) | new | arranges banner + KPI + reused blocks |
| status/phase breakdown | reuse | existing super-admin overview chart |
| at-risk list | reuse | render `stuckCourses` |
| `AuditView` | reuse | existing component |

New bespoke components live under `apps/web/components/provost/`.

## Data flow

- `/provost/page.tsx` (server component): role-gate (`provost` || `super_admin`),
  call `getSuperAdminData()`, pass `data` + `context.profile.fullName` to
  `ProvostDashboard`.
- KPI + banner values are **derived in a small pure helper** (e.g.
  `lib/provost/summary.ts`) from `SuperAdminData` so the math is testable in
  isolation and not buried in JSX.
- No new queries required — all data already fetched by `getSuperAdminData()`.

## Required backend change

The audit feed is the only gated piece. Extend audit read access to `provost`:
- Either render `AuditView` directly inside the provost dashboard (no separate
  page gate needed), **or** open `/super-admin/audit`'s role check to include
  `provost`. Chosen: render `AuditView` inside the provost dashboard so no route
  gate change is needed; `auditEvents` already flow through `getSuperAdminData()`.

No DB/migration change required (provost role + audit data already exist).

## Theme

Banner and KPI cards use the app's existing design tokens (`bg-card`,
`text-foreground`, `border-border`, `text-muted-foreground`, accent utilities)
so they adapt to light/dark like the rest of the app. No hardcoded colors except
semantic severity accents (amber/red for at-risk), which use dark-mode variants.

## Testing

- Unit test the pure summary helper (`lib/provost/summary.ts`): given a
  `SuperAdminData` fixture, asserts correct KPI values (total, % complete,
  in-progress, at-risk, instructor) and banner summary string.
- Typecheck + production build must pass (`npm run typecheck`, `npm run build`).
- Manual: log in as provost, confirm `/provost` renders banner + KPIs + breakdown
  + at-risk + activity feed, and that light/dark both look correct.

## Out of scope (YAGNI)

- Guided tour / tooltips walkthrough (chose welcome banner only).
- Command-center deep tools beyond the dashboard (drill-in stays on existing
  `/hierarchy` and `/provost/org`).
- New audit infrastructure or filtering UI beyond what `AuditView` already offers.
- Export / PDF of the dashboard.

## Navigation

- `/provost` → new executive dashboard (this spec).
- `/provost/org` → unchanged (org management).
- `/hierarchy` → unchanged (org chart, already provost-accessible).
