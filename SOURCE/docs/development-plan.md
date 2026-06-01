# CourseBridge Development Plan

This plan is designed for a solo developer building CourseBridge structurally, in small validated phases.

The goal is to avoid building random screens or premature infrastructure. Each phase should leave the app in a working, reviewable state.

## Guiding Rules

1. Build the workflow spine before building large UI surfaces.
2. Keep each task small enough to complete, test, and commit.
3. Do not add database tables until the product concept needs them.
4. Do not build PDF export, file storage, notifications, or advanced admin tooling until the MVP workflow works.
5. Every course status change must eventually go through workflow logic, not random UI updates.
6. Instructor access should be course-scoped through Supabase Auth and invite links.
7. Prefer boring, explicit TypeScript over clever abstractions.

## Target MVP

The first complete MVP should support this happy path:

1. Admin creates a course.
2. Admin assigns a TA and Instructor.
3. TA opens assigned course.
4. TA completes review sections.
5. TA submits review to Admin.
6. Admin approves or requests fixes.
7. Communication Department sends instructor review link.
8. Instructor reviews, asks questions, or approves.
9. Course reaches Final Approved status.

## Phase 0: Project Foundation

Status: In progress.

Purpose:
Create a stable monorepo and app shell.

Deliverables:
- Turborepo root.
- `apps/web` Next.js App Router app.
- Shared package folders.
- Supabase client helper setup.
- shadcn/ui foundation.
- Project docs.

Acceptance checks:
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- App runs locally with `npm run dev`.

Do not do yet:
- Full schema.
- Login flow.
- Review forms.
- Instructor invite flow.

## Phase 1: Workflow Spine

Purpose:
Define the roles, statuses, and valid course transitions before building the database or screens.

Primary package:
- `packages/workflow`

Files to create:
- `packages/workflow/src/roles.ts`
- `packages/workflow/src/statuses.ts`
- `packages/workflow/src/transitions.ts`
- `packages/workflow/src/index.ts`

Deliverables:
- Role constants.
- Course status constants.
- Allowed transition map.
- Function to check whether a role can transition a course from one status to another.
- Basic unit-test-ready pure functions, even if test framework is added later.

Suggested roles:
- `ta`
- `admin`
- `communications`
- `instructor`
- `super_admin`

Suggested statuses:
- `course_created`
- `assigned_to_ta`
- `ta_review_in_progress`
- `submitted_to_admin`
- `admin_changes_requested`
- `admin_approved`
- `sent_to_instructor`
- `instructor_questions`
- `instructor_approved`
- `final_approved`

Acceptance checks:
- Workflow logic is centralized in `packages/workflow`.
- UI code imports statuses and roles from the workflow package.
- No hardcoded workflow status strings in app screens.
- `npm run typecheck` passes.

Do not do yet:
- Database enforcement.
- RLS policies.
- Admin UI for editing workflow.

## Phase 2: Data Model Draft

Purpose:
Design the minimum Postgres schema on paper before creating migrations.

File to create:
- `docs/data-model.md`

Core tables to define:
- `profiles`
- `courses`
- `course_assignments`
- `course_status_events`
- `review_sections`
- `review_responses`
- `course_comments`
- `review_invites`

Key decisions:
- `auth.users` is owned by Supabase Auth.
- `profiles` stores app-specific role and display data.
- `course_assignments` controls who can access a course.
- `course_status_events` records important workflow changes.
- `review_invites` supports instructor course-scoped access.

Acceptance checks:
- Every table has a clear purpose.
- Every table has a proposed primary key.
- Relationships are documented.
- MVP queries are listed.
- Deferred tables are explicitly excluded.

Do not do yet:
- Create complex template systems.
- Add notification tables.
- Add file attachment tables unless needed for the first TA review.

## Phase 3: Initial Supabase Schema

Purpose:
Turn the approved data model into database migrations.

Files to create:
- `supabase/migrations/...`
- `supabase/README.md`

Deliverables:
- Initial tables.
- Basic indexes.
- Enum or text strategy for roles/statuses.
- Minimal seed data for local development if using Supabase local later.

Acceptance checks:
- Migration can be applied cleanly.
- Schema matches `docs/data-model.md`.
- No sensitive data committed.

Do not do yet:
- Advanced RLS.
- Storage buckets.
- PDF-related tables.

## Phase 4: Supabase Auth Foundation

Purpose:
Add real authentication and profile awareness.

Deliverables:
- Login route.
- Logout action.
- Auth callback route if needed.
- Server-side user lookup.
- Basic profile creation or profile sync.
- Protected app routes.

Suggested routes:
- `/login`
- `/auth/callback`
- `/dashboard`
- `/courses`

Acceptance checks:
- Anonymous users cannot access protected pages.
- Logged-in users can see their role.
- App handles missing profile state gracefully.
- `npm run build` passes.

Do not do yet:
- Clerk.
- Password-heavy custom auth.
- Organization management.

## Phase 5: Dashboard And Navigation Shell

Purpose:
Create the work surface users will live in.

Deliverables:
- Sidebar navigation.
- Header with user/role area.
- Dashboard overview.
- Course list page.
- Course detail layout.

Suggested pages:
- `/dashboard`
- `/courses`
- `/courses/[courseId]`

Acceptance checks:
- Layout works on desktop and mobile.
- Navigation matches user role where practical.
- Course detail page has obvious sections for review, comments, history, and actions.

Do not do yet:
- Fancy analytics.
- Complex filters.
- Bulk operations.

## Phase 6: Course CRUD And Assignment

Purpose:
Let Admins create courses and assign the right people.

Deliverables:
- Admin create course form.
- Course list backed by Supabase.
- Course assignment form.
- Assign TA.
- Assign Instructor.
- Initial status transition from `course_created` to `assigned_to_ta`.

Acceptance checks:
- Admin can create a course.
- Admin can assign TA and Instructor.
- Assigned TA sees the course.
- Non-assigned users cannot access the course.

Do not do yet:
- CSV imports.
- Bulk course assignment.
- LMS integrations.

## Phase 7: TA Review Form

Purpose:
Build the core review work for assigned TAs.

Deliverables:
- Review sections.
- Review response save.
- Draft state.
- Submit to Admin action.

Initial review sections:
- Course metadata.
- Review matrix.
- Syllabus review.
- Gradebook review.
- General notes.

Acceptance checks:
- TA can save draft responses.
- TA can submit to Admin.
- Submit action uses workflow transition logic.
- Admin can view submitted responses.

Do not do yet:
- Complex conditional forms.
- Rich template editor.
- PDF export.

## Phase 8: Admin Review Flow

Purpose:
Allow Admin to approve or request fixes.

Deliverables:
- Admin review page.
- Approve action.
- Request fixes action.
- Internal comments.
- Status event creation.

Acceptance checks:
- Admin can approve TA submission.
- Admin can request fixes and send course back to TA.
- TA can see requested fixes.
- Instructor cannot see internal admin comments.

Do not do yet:
- Full audit UI.
- Advanced diffing.

## Phase 9: Communications And Instructor Invite

Purpose:
Create the instructor-facing review handoff.

Deliverables:
- Communications queue.
- Generate instructor invite.
- Send/copy instructor link.
- Instructor route guarded by Supabase Auth and course assignment/invite checks.

Suggested routes:
- `/communications`
- `/instructor/reviews/[courseId]`

Acceptance checks:
- Communications user can send or copy a review link.
- Instructor can authenticate by email/magic link.
- Instructor only sees assigned course package.
- Expired or invalid invite is rejected.

Do not do yet:
- Email provider automation unless needed.
- Custom branded email templates.

## Phase 10: Instructor Review And Final Approval

Purpose:
Complete the MVP workflow.

Deliverables:
- Instructor review page.
- Instructor questions/comments.
- Instructor approval action.
- Final approval status.

Acceptance checks:
- Instructor can ask a question.
- Internal users can respond.
- Instructor can approve.
- Course reaches `final_approved`.
- Status history records the key event.

Do not do yet:
- Multi-round complex instructor negotiations.
- External file upload unless required.

## Phase 11: Hardening

Purpose:
Make the MVP safer before broad use.

Deliverables:
- RLS policy review.
- Error states.
- Empty states.
- Loading states.
- Basic test coverage for workflow logic.
- CI workflow.

Recommended CI:
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=high`

Acceptance checks:
- CI passes on pull requests.
- Workflow package has tests.
- Permission bugs are checked at server/database level, not only in UI.

## Phase 12: Later Enhancements

Only start these after the MVP workflow works end to end:

- File attachments and screenshots.
- Cloudflare R2 storage.
- PDF export.
- Notifications.
- Realtime comments.
- Course import.
- Template editor.
- Advanced reporting.
- Full audit timeline UI.
- Vercel preview deployment.

## Solo Developer Weekly Rhythm

Use this repeatable cycle:

1. Pick one phase.
2. Pick one deliverable inside that phase.
3. Write or update the relevant doc first.
4. Implement the smallest working slice.
5. Run checks.
6. Commit.
7. Update this plan if reality changed.

Do not keep more than one major feature in progress.

## Suggested First Five Tickets

1. Build workflow roles and statuses in `packages/workflow`.
2. Add workflow transition rules and transition guard helpers.
3. Draft `docs/data-model.md`.
4. Create initial Supabase schema migration.
5. Add login and protected dashboard route.

## Agent Instructions

Before coding, agents should read:

- `CLAUDE.md`
- `AGENTS.md`
- `docs/development-plan.md`
- Relevant docs for the current phase

Agents should report:

1. Which phase they are working on.
2. What files they changed.
3. Which checks they ran.
4. What the next safe step is.
