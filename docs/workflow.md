# Workflow

Last updated: 2026-06-03

> Canonical source of truth is code, not this doc:
> statuses + phase grouping in `packages/workflow/src/statuses.ts`, the enforced
> transition graph in `packages/workflow/src/transitions.ts`. Keep this file in
> sync with those.

## Course Lifecycle

The flow now includes the **staging-shell** steps (`waiting_on_admin` →
`staging_in_progress`) between admin approval and sending to the instructor.
Admin approval no longer goes straight to `ready_for_instructor`.

```
course_created
  → assigned_to_ta
    → ta_review_in_progress
      → submitted_to_admin
        → admin_changes_requested   ← admin sends back for fixes
            → ta_review_in_progress  (staff resumes)
              → submitted_to_admin
        → waiting_on_admin          ← admin approves review, builds staging shell
          → staging_in_progress      (staff finalizes staging)
            → ready_for_instructor   ← staff marks staging complete
              → sent_to_instructor
                → instructor_viewing    ← auto-set when invite link is opened
                → instructor_questions  ← instructor has questions
                    → sent_to_instructor  (resolved by comms/admin, resent)
                → instructor_approved   ← instructor approves
                  → final_approved
```

## Statuses

| Status | Label | Who triggers it |
|---|---|---|
| `course_created` | Course Created | System / import |
| `assigned_to_ta` | Assigned to TA | Admin, Super Admin |
| `ta_review_in_progress` | TA Review In Progress | Staff, Admin, Super Admin |
| `submitted_to_admin` | Submitted to Admin | Staff, Super Admin |
| `admin_changes_requested` | Admin Changes Requested | Admin, Super Admin |
| `waiting_on_admin` | Waiting on Admin | Admin, Super Admin |
| `staging_in_progress` | Staging in Process | Admin, Super Admin |
| `ready_for_instructor` | Ready for Instructor | Staff, Super Admin |
| `sent_to_instructor` | Sent to Instructor | Admin Viewer, Admin, Super Admin |
| `instructor_viewing` | Instructor Viewing | Instructor, Super Admin (auto on invite open) |
| `instructor_questions` | Instructor Questions | Instructor, Super Admin |
| `instructor_approved` | Instructor Approved | Instructor, Super Admin |
| `final_approved` | Final Approved | Admin, Super Admin |

## Roles

| Role key | Display name | Description |
|---|---|---|
| `super_admin` | Super Admin | Full system access |
| `admin_full` | Admin | Manages courses, assignments, approvals |
| `admin_viewer` | Viewer | Read-only admin + can send to instructor |
| `standard_user` | Staff (TA) | Performs course reviews |
| `instructor` | Instructor | Reviews and approves migrated course |

### Role terminology — `standard_user` vs `staff` vs "TA"

Three names refer to the same person; they live at different layers and are
**not** interchangeable identifiers:

- **`standard_user`** — the **profile role** (`profiles.role`). This is what the
  transition graph in `transitions.ts` checks. Course status changes are gated
  on the profile role, **not** the assignment role.
- **`staff`** — the **assignment role** (`course_assignments.role`), i.e. the
  worker assigned to a *specific* course. Used for course-level access checks.
- **"TA"** — **UI copy only**. The product still labels this role "TA" in
  several screens; it carries no backend meaning.

When reading code: a transition rule says `standard_user`; an assignment row
says `staff`; a button or column header may say `TA`. All three describe the
reviewing staff member.

## Transition Rules

All transitions are enforced in `packages/workflow/src/transitions.ts`. No UI
can bypass them — server actions go through `transitionCourseStatus`
(`apps/web/lib/courses/service.ts`), which validates the target status, checks
the role transition and course access, updates `courses.status`, then inserts a
`course_status_events` audit row.

```
course_created          → assigned_to_ta            admin_full, super_admin
assigned_to_ta          → ta_review_in_progress     standard_user, admin_full, super_admin
ta_review_in_progress   → submitted_to_admin        standard_user, super_admin
submitted_to_admin      → admin_changes_requested   admin_full, super_admin
submitted_to_admin      → waiting_on_admin          admin_full, super_admin
admin_changes_requested → ta_review_in_progress     standard_user, admin_full, super_admin
waiting_on_admin        → staging_in_progress       admin_full, super_admin
staging_in_progress     → ready_for_instructor      standard_user, super_admin
ready_for_instructor    → sent_to_instructor        admin_viewer, admin_full, super_admin
sent_to_instructor      → instructor_viewing        instructor, super_admin
sent_to_instructor      → instructor_questions      instructor, super_admin
sent_to_instructor      → instructor_approved       instructor, super_admin
instructor_viewing      → instructor_questions      instructor, super_admin
instructor_viewing      → instructor_approved       instructor, super_admin
instructor_questions    → sent_to_instructor        admin_viewer, admin_full, super_admin
instructor_approved     → final_approved            admin_full, super_admin
```

## Instructor Visibility

Instructors can only see courses in one of these statuses
(`isInstructorVisibleStatus` in `statuses.ts`):

- `sent_to_instructor`
- `instructor_viewing`
- `instructor_questions`
- `instructor_approved`
- `final_approved`

## Pipeline Stages

Statuses are grouped into three pipeline stages (`getPipelineStage` /
`WORKFLOW_PHASES` in `statuses.ts`), used by the dashboard boards:

- **Migration**: `course_created`, `assigned_to_ta`, `ta_review_in_progress`
- **Staging**: `submitted_to_admin`, `admin_changes_requested`,
  `waiting_on_admin`, `staging_in_progress`, `ready_for_instructor`,
  `sent_to_instructor`, `instructor_viewing`, `instructor_questions`,
  `instructor_approved`
- **Provision**: `final_approved`
