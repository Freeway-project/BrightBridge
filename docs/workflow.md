# Workflow

Last updated: 2026-05-04

## Course Lifecycle

```
course_created
  → assigned_to_ta
    → ta_review_in_progress
      → submitted_to_admin
        → admin_changes_requested  ← admin sends back for fixes
            → ta_review_in_progress  (TA resumes)
              → submitted_to_admin
        → ready_for_instructor     ← admin approves
          → sent_to_instructor
            → instructor_questions  ← instructor has questions
                → sent_to_instructor  (resolved by comms/admin)
            → instructor_approved   ← instructor approves
              → final_approved
```

## Statuses

| Status | Label | Who triggers it |
|---|---|---|
| `course_created` | Course Created | System / import |
| `assigned_to_ta` | Assigned to TA | Admin, Super Admin |
| `ta_review_in_progress` | TA Review In Progress | Staff (TA), Admin, Super Admin |
| `submitted_to_admin` | Submitted to Admin | Staff (TA), Super Admin |
| `admin_changes_requested` | Admin Changes Requested | Admin, Super Admin |
| `ready_for_instructor` | Ready for Instructor | Admin, Super Admin |
| `sent_to_instructor` | Sent to Instructor | Admin Viewer, Admin, Super Admin |
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

## Transition Rules

All transitions are enforced in `packages/workflow/src/transitions.ts`. No UI can bypass them — server actions must call `assertCanTransition` before updating the database.

```
course_created        → assigned_to_ta            admin_full, super_admin
assigned_to_ta        → ta_review_in_progress      standard_user, admin_full, super_admin
ta_review_in_progress → submitted_to_admin         standard_user, super_admin
submitted_to_admin    → admin_changes_requested    admin_full, super_admin
submitted_to_admin    → ready_for_instructor       admin_full, super_admin
admin_changes_requested → ta_review_in_progress   standard_user, admin_full, super_admin
ready_for_instructor  → sent_to_instructor         admin_viewer, admin_full, super_admin
sent_to_instructor    → instructor_questions       instructor, super_admin
instructor_questions  → sent_to_instructor         admin_viewer, admin_full, super_admin
sent_to_instructor    → instructor_approved        instructor, super_admin
instructor_approved   → final_approved             admin_full, super_admin
```

## Instructor Visibility

Instructors can only see courses in one of these statuses:

- `sent_to_instructor`
- `instructor_questions`
- `instructor_approved`
- `final_approved`

## Pipeline Stages

Statuses are grouped into three pipeline stages used for overview displays:

- **Initiated**: `course_created`, `assigned_to_ta`
- **In Progress**: everything between
- **Completed**: `final_approved`
