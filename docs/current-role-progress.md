# BrightBridge Current Status By Role

Last updated: 2026-04-29

## Overall System Status

BrightBridge currently has the core workflow foundation in place:

- Next.js App Router app shell with role-based dashboard routing
- Supabase auth, profile lookup, role guards, and server-side admin client usage
- Workflow statuses and transition rules in `packages/workflow`
- Core database tables and migrations for profiles, courses, assignments, review sections, review responses, comments, and invites
- Core RLS and review-response policies
- Sentry wiring, Vercel Analytics, and Speed Insights

The current product is best described as:

- TA review workflow: working MVP
- Admin assignment workflow: working MVP
- Super Admin oversight: working read/monitoring view
- Instructor workflow: not built yet
- Communications workflow: not built yet
- Full admin review workflow after TA submission: not built yet

## Role Summary

### TA

Implemented:

- TA can sign in and land on the TA dashboard through role-based redirect
- TA dashboard is connected to real Supabase course data
- TA can open assigned courses
- TA workspace has a 5-step review flow:
  1. Metadata
  2. Review Matrix
  3. Syllabus & Gradebook
  4. Issue Log
  5. Submit
- Draft responses are saved to `review_responses`
- Submit flow marks responses submitted and transitions the course to `submitted_to_admin`
- Issue log is integrated with the review workflow
- Review timers are present in the workspace forms

Current limitations:

- TA dashboard has local uncommitted UI work in progress moving toward the newer course list view
- Comment/chat workflow is not yet a user-facing TA feature, even though `course_comments` exists in the schema
- Attachments are not implemented

### Admin

Implemented:

- Admin can sign in and access the Admin dashboard
- Admin dashboard shows a real course queue
- Admin can select a course and assign a TA
- TA options come from real `profiles` rows with role `ta`
- Assignment writes to `course_assignments`
- If needed, assignment flow transitions a course from `course_created` to `assigned_to_ta`

Current limitations:

- Full admin review of submitted TA work is not built
- No admin workflow yet for reviewing each TA section, requesting changes, or approving for instructor handoff
- No admin-facing threaded comment or chat UI yet

### Communications

Implemented:

- Route exists
- Role-based access path exists through dashboard routing

Current limitations:

- Dashboard is still a stub with "Coming soon"
- No handoff queue
- No communications-specific workflow logic
- No use of `course_comments` or downstream handoff logic in the UI

### Instructor

Implemented:

- Route exists
- Instructor profiles can be selected in the TA syllabus/gradebook step
- Instructor assignment data model exists

Current limitations:

- Instructor dashboard is still a stub with "Coming soon"
- No instructor review screen
- No invite/token flow built on top of `review_invites`
- No instructor-visible comments or approval workflow in the UI

### Super Admin

Implemented:

- Super Admin dashboard is active
- Dashboard uses real live data
- Overview includes system-level visibility into courses and users
- Monitoring views and supporting queries are wired

Current limitations:

- This is an oversight/visibility layer, not an operational workflow layer
- It does not replace the missing Admin, Instructor, or Communications end-to-end flows

## Data Layer Status

Actively used now:

- `profiles`
- `courses`
- `course_assignments`
- `course_status_events`
- `review_sections`
- `review_responses`

Present in schema but not fully productized yet:

- `course_comments`
- `review_invites`

## Current Phase

The project is currently in:

- TA Review Capture + Admin Assignment MVP

This means the app supports the beginning and middle of the workflow, but not the full end-to-end lifecycle through instructor and communications completion.

## Remaining Work By Phase

Next highest-value phase:

- Build the Admin Review workspace

After that:

- Build the Instructor review and approval flow
- Build the Communications handoff queue and downstream workflow
- Add user-facing comments/chat and attachment handling

## Current Local WIP

There are local uncommitted workspace changes at the time of this summary:

- TA dashboard is being refactored from the older table client to the newer shared course list view
- `apps/web/lib/courses/service.ts` has a local type fix for review progress mapping

These changes are in the working tree and may not yet be pushed or merged beyond the current local state.
