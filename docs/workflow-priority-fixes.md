# Workflow priority fixes

Tracking discrepancies found in the course workflow audit (2026-05-27) and the
plan to resolve them. Each item lists the layers it touches so reviewers can
scope their attention.

This branch (`workflow-priority-fixes`) lands these as separate commits so they
can be cherry-picked or reverted individually.

---

## P0 — workflow-blocking

### 1. Resend-to-Instructor button

**Problem.** The transition `instructor_questions → sent_to_instructor` is
allowed by the workflow for `admin_viewer`, `admin_full`, and `super_admin`.
The server action `sendToInstructorAction` already implements it. But the only
UI surface that calls the action is `SendToInstructorBanner`, which is gated to
`ready_for_instructor` in `admin/courses/[id]/page.tsx`. Result: when an
instructor raises a question, the course is workflow-locked from the UI — admin
must manually update the DB to recover.

**Fix.** Add a `variant: "send" | "resend"` prop to `SendToInstructorBanner`
that adjusts copy. Render the banner in both `ready_for_instructor` and
`instructor_questions` states, with `QuestionRoundBanner` kept above it for
context when status is `instructor_questions`.

**Layers touched.** Frontend only. No DB, no backend (the action and
transition already exist).

---

## P1 — loopback UX

### 2. Surface admin's Request Fixes note on TA's submit page

**Problem.** When admin clicks Request Fixes and types feedback, the note is
stored in `course_status_events.note` on the `submitted_to_admin →
admin_changes_requested` transition. The TA's submit page renders only a
generic amber alert with no specific feedback — they have to dig into the
course conversation/audit log to find what was asked.

**Fix.** Add a small read helper that returns the most recent
`course_status_events.note` for `to_status = 'admin_changes_requested'` on a
course. Pass it to `SubmitPanel` from the submit page server component. Render
it inside the existing amber alert.

**Layers touched.**
- DB: none (data already persisted).
- Backend: small read helper in `lib/courses/service.ts`.
- Frontend: prop wiring in `submit-panel.tsx` and `submit/page.tsx`.

### 3. Eliminate double `course_status_events` on resubmit

**Problem.** `submitReview` walks `admin_changes_requested → ta_review_in_progress
→ submitted_to_admin` as two transitions, writing two status-event rows. The
notification provider fires twice; the audit log has a phantom intermediate
row.

**Fix.** Add `{ from: "admin_changes_requested", to: "submitted_to_admin",
roles: ["standard_user", "super_admin"] }` to `COURSE_TRANSITIONS`. Simplify
`submitReview` to call `transitionCourseStatus` once.

**Layers touched.**
- DB: none (CHECK constraint already allows both values).
- Backend: workflow package + `lib/workspace/actions.ts`.
- Frontend: none.

---

## P2 — consistency / hygiene

### 4. Unify status labels (kill hardcoded strings in `NextStepBadge`)
- Frontend only. Move "Fix Requested" / "Waiting on Admin" out of inline
  strings in `course-table.tsx` and into a shared label map.

### 5. Notify `admin_viewer` (Communications) on staging events
- Frontend only. Add an `else if (role === "admin_viewer")` branch in
  `notification-provider.tsx` for `ready_for_instructor` and
  `instructor_questions`.

### 6. Delete dead `STATUS_BADGE_CLASS`
- Frontend only. Unused export in `lib/constants/status.ts`.

---

## P3 — design-first

### 7. Sub-state pattern for future "admin in progress"
- Adds a `courses.sub_status TEXT NULL` column + derived UI. Out of scope for
  this branch — needs a short design doc before implementing.
