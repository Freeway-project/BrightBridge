# CourseBridge — Session Context
> Last updated: 2026-04-29. Save this file. It is the handoff document for switching environments.

---

## Git State

**Current branch:** `ft-ta-review-capture` (clean, no uncommitted changes)

**Main branch is up to date.** All PRs merged:
- PR #3 / PR #6 — UI dashboard shell (merged into main)
- PR #5 / PR #7 — backend auth + RLS (merged into main)

**Other local branches (not merged):**
- `ft-graphify-analysis` — graphify output + design handoff wireframes (PR not raised yet)
- `ft-core-rls-auth` — may have leftover stash, ignore
- `ft-Phase-2`, `ft-workflow` — old, ignore

**Working branch for next task:** `ft-ta-review-capture` — currently empty (just branched from main). This is where TA review forms go.

---

## Environment

**App:** Next.js 16, Turborepo monorepo  
**Location:** `/Users/harshsaw/Github/BrightBridge`  
**Run dev:** `cd apps/web && npm run dev` → `http://localhost:3000`

**`.env.local`** at `apps/web/.env.local` — all three keys are set:
```
NEXT_PUBLIC_SUPABASE_URL=https://zgqepddmqgtoeczwoetx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IinL8isMugKq6AY3-QUfIw_KXYsSUQM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  (present)
DATABASE_URL=postgresql://postgres:...  (present)
```

**Supabase project:** `zgqepddmqgtoeczwoetx.supabase.co`

**Dev login:** Go to `http://localhost:3000/auth/login` — dev quick-login buttons appear at the bottom in dev mode. Or use email OTP with any email — new users now auto-get `ta` role (trigger applied).

**Role switcher:** Floating card bottom-right when signed in (dev mode only). Click a role → profile upserted → navigate to `/dashboard` to land on new role's page.

---

## Supabase Migrations Applied

| File | What it does |
|------|-------------|
| `20260428121500_initial_schema.sql` | All 8 tables: profiles, courses, course_assignments, course_status_events, review_sections, review_responses, course_comments, review_invites. RLS enabled but no policies. |
| `20260428224230_core_rls_policies.sql` | Core RLS helper functions + SELECT policies for profiles, courses, course_assignments, course_status_events |
| `20260429000000_monitoring_setup.sql` | pg_stat_statements + monitoring views: slow_queries, course_status_counts, stuck_courses, ta_workload |
| `20260429100000_auto_create_profile_on_signup.sql` | Trigger on auth.users INSERT → auto-creates profiles row with role='ta' |

**Pending:** `review_sections` and `review_responses` have NO RLS policies yet. Needed before TA review form goes live:
```sql
-- Add to a new migration when building TA review forms:
create policy "Authenticated users can read review sections"
  on public.review_sections for select to authenticated using (true);

create policy "TA can read own responses"
  on public.review_responses for select to authenticated
  using (responded_by = auth.uid());

create policy "TA can insert own responses"
  on public.review_responses for insert to authenticated
  with check (responded_by = auth.uid());

create policy "TA can update own draft responses"
  on public.review_responses for update to authenticated
  using (responded_by = auth.uid() and status = 'draft');
```

---

## What Is Built (on main)

### Packages
- `packages/workflow` — roles, statuses, transitions, canTransition(), assertCanTransition(), getAllowedTransitions()
- `packages/ui` — custom Badge stub (mostly unused, shadcn Badge used instead)
- `packages/validation` — empty, ready for Zod schemas

### Auth
- Supabase SSR client (server + browser + admin)
- Magic link + dev password login
- `lib/auth/context.ts` → `getAuthContext()` returns `anonymous | missing_profile | profile`
- Dev role switcher (`components/dev-role-switcher.tsx`) — upserts profile row
- Trigger: new signups auto-get `ta` profile

### Routes
```
/                          → redirects to /auth/login
/auth/login                → magic link + dev quick-login
/auth/callback             → Supabase callback
/auth/check-email          → post-OTP confirmation
/dashboard                 → reads profile.role → redirects to role dashboard
/(dashboard)/ta            → TA dashboard (MOCK DATA — real data next)
/(dashboard)/admin         → stub
/(dashboard)/communications → stub
/(dashboard)/instructor    → stub
/(dashboard)/super-admin   → FULL dashboard with real data (4 tabs)
/(dashboard)/courses/[id]/metadata         → stub
/(dashboard)/courses/[id]/review-matrix    → stub
/(dashboard)/courses/[id]/syllabus-gradebook → stub
/(dashboard)/courses/[id]/issue-log        → stub
/(dashboard)/courses/[id]/submit           → stub
```

### Components
```
components/
  ui/           shadcn primitives — button, card, input, table, badge, select,
                separator, scroll-area, avatar, tabs, sheet, collapsible, progress
  layout/       sidebar.tsx, topbar.tsx (no business logic)
  courses/      status-badge.tsx, course-table.tsx, course-filter-bar.tsx,
                course-action-button.tsx
  shared/       stat-card.tsx, error-display.tsx
  super-admin/  super-admin-shell.tsx (tabs: Overview/Courses/Users/Audit Trail)
```

### Lib
```
lib/
  auth/context.ts          getAuthContext(), requireProfile(), requireAnyRole()
  constants/status.ts      STATUS_BADGE_CLASS, TA_COURSE_ACTIONS
  constants/nav.ts         NAV_ITEMS per role
  mock/courses.ts          MOCK_COURSES (6 sample courses, TA dashboard only)
  courses/service.ts       getAccessibleCourses(), createCourse(),
                           assignUserToCourse(), transitionCourseStatus()
  super-admin/queries.ts   getSuperAdminData() — parallel fetch of all system data
  supabase/                server.ts, client.ts, admin.ts
```

### Monitoring / Error Handling
- Vercel Analytics + Speed Insights in root layout
- Sentry: client/server/edge configs, instrumentation.ts, withSentryConfig in next.config.ts
- `app/global-error.tsx` — root crash boundary → Sentry.captureException
- `app/(dashboard)/error.tsx` — per-page error inside sidebar shell → Sentry.captureException
- `app/not-found.tsx` — 404 page

---

## What Is NOT Built Yet (next task)

### TA Review Form — 5-step course workspace

**Branch:** `ft-ta-review-capture` (empty, ready to build on)

**Goal:** TA can open an assigned course, fill review sections, save draft, submit to admin.

**The 5 steps (routes already exist as stubs):**
1. `/courses/[id]/metadata` — course identity fields, pre-filled from `courses` table
2. `/courses/[id]/review-matrix` — checklist table (Pass/Fail/N/A per item), collapsible sections
3. `/courses/[id]/syllabus-gradebook` — dual confirmation + gradebook table
4. `/courses/[id]/issue-log` — issue table + side drawer
5. `/courses/[id]/submit` — summary + submit to admin action

**Data model for forms:**
- `review_sections` table — 5 seeded sections (course_metadata, review_matrix, syllabus_review, gradebook_review, general_notes)
- `review_responses` table — one row per course+section, `response_data JSONB`, `status: draft|submitted`
- Writes go through service-role (no RLS write policies yet — add migration above)
- Reads need RLS policies (add migration above before going live)

**Key design decisions (agreed):**
- Use `react-hook-form` + `zod` — NOT currently installed, need to install
- Forms must be modular — each step is an isolated component, schema in its own file
- `response_data` is JSONB — define TypeScript types per section that match
- Save draft on blur/change (auto-save), explicit Submit button for final submit
- Submit triggers `transitionCourseStatus({ toStatus: 'submitted_to_admin' })` from `lib/courses/service.ts`
- Step nav shows completed/active/pending state per step
- Review timer: runs per session, displays HH:MM:SS, pause/resume, auto-populates metadata "Time Required"

**Components to build:**
```
components/workspace/
  step-nav.tsx              left column step navigator with done/active/pending
  review-timer.tsx          HH:MM:SS timer, pause/resume (client component)
  workspace-layout.tsx      3-col shell: step-nav | form | info-panel
  info-panel.tsx            right col: status badge, people, progress, last saved

components/workspace/steps/
  metadata-form.tsx         Step 1 form
  review-matrix-form.tsx    Step 2 checklist table
  syllabus-gradebook-form.tsx Step 3
  issue-log.tsx             Step 4 table + sheet drawer
  submit-panel.tsx          Step 5

lib/workspace/
  schemas.ts                Zod schemas per step
  types.ts                  TypeScript types for response_data per section
  actions.ts                Server actions: saveDraft(), submitReview()
```

**Review matrix default checklist (seeded via section template):**
- A. Course Shell & Navigation (4 items)
- B. Pages & Files (4 items)
- C. Links & Embedded Content (3 items)

---

## Known Issues / Bugs Fixed This Session

| Bug | Fix |
|-----|-----|
| `course_assignments` has two FK to `profiles` (profile_id + assigned_by) — Supabase embed ambiguity error | Fixed: use `profiles!course_assignments_profile_id_fkey` in select query |
| `service.ts` TypeScript error: `roleWideCourseRoles.includes(profile.role)` type mismatch | Fixed: cast to `readonly Role[]` |
| Missing `</body>` tag in root layout after adding Sentry | Fixed |

---

## Packages NOT Installed Yet (needed for TA forms)

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add textarea
```

---

## Architectural Decisions

**RBAC & Organizational Hierarchy (New)**
We are moving away from Supabase RLS towards Application-Layer Security (PBAC).
See `docs/rbac-architecture.md` for the full 3-Layer Access Control Model:
1. **Global Roles:** `super_admin`, `admin_full`, `admin_viewer`, `standard_user`
2. **Hierarchy:** `organizational_units` (Implicit Read Access)
3. **Case Team:** `course_assignments` (Explicit Write Access for `staff` and `instructor`)

---

## Next Steps (in order)

1. `git checkout ft-ta-review-capture`
2. Install `react-hook-form`, `@hookform/resolvers`, `zod`, shadcn `textarea`
3. Add RLS migration for `review_sections` + `review_responses`
4. Build `lib/workspace/schemas.ts` and `lib/workspace/types.ts`
5. Build `lib/workspace/actions.ts` (saveDraft, submitReview server actions)
6. Build workspace layout components (step-nav, timer, info-panel)
7. Build Step 1: Metadata form (pre-fill from course row)
8. Build Step 2: Review Matrix (collapsible checklist)
9. Build Step 3: Syllabus & Gradebook
10. Build Step 4: Issue Log + sheet drawer
11. Build Step 5: Submit panel + transition to submitted_to_admin
12. Replace TA dashboard MOCK_COURSES with real `getAccessibleCourses()` query
13. PR → merge → then Admin review screen
