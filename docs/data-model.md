# CourseBridge Data Model Draft

This is the first MVP data model draft for CourseBridge.

It is intentionally a planning document, not a migration. Review this before creating Supabase tables.

## Scope

The MVP data model must support:

1. Supabase-authenticated users.
2. App-specific roles.
3. Course creation.
4. TA and Instructor assignment.
5. Course status workflow.
6. TA review sections and responses.
7. Admin review decisions.
8. Instructor questions and approval.
9. Instructor invite links.
10. Basic status history.

## Key Design Decisions

- Supabase owns `auth.users`.
- App profile and role data lives in `profiles`.
- Course access is controlled through `course_assignments`.
- Current workflow state is stored on `courses.status`.
- Workflow history is stored in `course_status_events`.
- Workflow status values should match `packages/workflow`.
- Review content is split into reusable section definitions and course-specific responses.
- Instructor access should be course-scoped.
- Internal comments and instructor-visible comments must be distinguishable.

## Workflow Values

The initial course statuses are:

```text
course_created
assigned_to_ta
ta_review_in_progress
submitted_to_admin
admin_changes_requested
ready_for_instructor
sent_to_instructor
instructor_questions
instructor_approved
final_approved
```

The initial app roles are:

```text
ta
admin
communications
instructor
super_admin
```

In the first schema, these can be stored as text with constraints or Postgres enums. The important rule is that database values must stay aligned with `packages/workflow`.

## Tables

## `profiles`

Purpose:
Stores app-specific user data for Supabase Auth users.

Supabase Auth already stores login identity in `auth.users`. This table stores CourseBridge-specific user information.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. References `auth.users.id`. |
| `email` | `text` | User email. Usually copied from auth user. |
| `full_name` | `text` | Display name. |
| `role` | `text` | One of app roles. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated when profile changes. |

Relationships:

- `profiles.id` references `auth.users.id`.
- Referenced by course creation, assignments, comments, and status events.

MVP permissions:

- A user can read their own profile.
- Admin and Super Admin can read profiles needed for assignment.
- Super Admin can update roles.
- Admin role management can be added later if needed.

Open decisions:

- Whether Admin can create/modify users directly or only assign existing users.
- Whether Instructor profiles are created before invite or on first login.

## `courses`

Purpose:
Stores one migrated course review case.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `source_course_id` | `text` | Original Moodle/course identifier if available. |
| `target_course_id` | `text` | Brightspace/course identifier if available. |
| `title` | `text` | Course title. |
| `term` | `text` | Academic term, e.g. `2026 Spring`. |
| `department` | `text` | Department or unit. |
| `status` | `text` | Current workflow status. Defaults to `course_created`. |
| `created_by` | `uuid` | References `profiles.id`. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated when course changes. |

Relationships:

- Created by one profile.
- Has many course assignments.
- Has many review responses.
- Has many comments.
- Has many status events.
- Has many review invites.

MVP permissions:

- Admin and Super Admin can create courses.
- Assigned users can read courses they are assigned to.
- Admin, Communications, and Super Admin can read relevant course queues.
- Status updates must go through workflow logic.

Open decisions:

- Whether `department` should become a separate table later.
- Whether `term` should become a structured table later.

## `course_assignments`

Purpose:
Controls which users are connected to which courses and in what role.

This table is the main access-control bridge between users and courses.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `course_id` | `uuid` | References `courses.id`. |
| `profile_id` | `uuid` | References `profiles.id`. |
| `role` | `text` | Course-specific role: `ta`, `instructor`, etc. |
| `assigned_by` | `uuid` | References `profiles.id`. |
| `assigned_at` | `timestamptz` | Default `now()`. |

Recommended constraints:

- Unique combination of `course_id`, `profile_id`, and `role`.

Relationships:

- Belongs to a course.
- Belongs to a profile.
- Created by a profile.

MVP permissions:

- Admin and Super Admin can assign users.
- Users can read their own assignments.
- Course access checks should use this table.

Open decisions:

- Whether Communications users need explicit course assignments or role-wide queue access.

## `course_status_events`

Purpose:
Stores workflow history.

This is the audit trail for important status changes.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `course_id` | `uuid` | References `courses.id`. |
| `from_status` | `text` | Previous workflow status. Nullable for initial event. |
| `to_status` | `text` | New workflow status. |
| `actor_id` | `uuid` | References `profiles.id`. |
| `actor_role` | `text` | Role used for the transition. |
| `note` | `text` | Optional reason or comment. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Belongs to a course.
- Belongs to actor profile.

MVP permissions:

- Assigned/internal users can read status history for accessible courses.
- Only server-side workflow actions should create these records.
- Users should not manually edit status events.

Open decisions:

- Whether Instructor should see all status events or only instructor-visible events.

## `review_sections`

Purpose:
Defines review form sections.

This lets the app render consistent review sections without hardcoding all form structure in page components.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `key` | `text` | Stable key, e.g. `course_metadata`. |
| `title` | `text` | Display title. |
| `description` | `text` | Optional helper text. |
| `sort_order` | `integer` | Display order. |
| `is_active` | `boolean` | Whether section is used. |
| `created_at` | `timestamptz` | Default `now()`. |

Initial sections:

- `course_metadata`
- `review_matrix`
- `syllabus_review`
- `gradebook_review`
- `general_notes`

Relationships:

- Has many review responses.

MVP permissions:

- All authenticated internal users can read active review sections.
- Super Admin can manage sections later.

Open decisions:

- Whether section fields/questions should be a separate table.
- Whether section templates need versioning.

## `review_responses`

Purpose:
Stores course-specific review answers.

For MVP, this can store flexible JSON per section instead of creating many narrow field tables.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `course_id` | `uuid` | References `courses.id`. |
| `section_id` | `uuid` | References `review_sections.id`. |
| `responded_by` | `uuid` | References `profiles.id`. |
| `response_data` | `jsonb` | Section answers. |
| `status` | `text` | Draft/submitted if needed. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated when response changes. |

Recommended constraints:

- Unique combination of `course_id` and `section_id` for one active response per section.

Relationships:

- Belongs to a course.
- Belongs to a review section.
- Created/updated by a profile.

MVP permissions:

- Assigned TA can create and update review responses before submission.
- Admin can read responses after submission.
- Instructor can read only instructor-visible review package content later.

Open decisions:

- Whether each section should support multiple revisions.
- Whether response status is needed if course status already controls draft/submitted state.

## `course_comments`

Purpose:
Stores comments/questions connected to a course.

This supports internal admin/TA notes and instructor-visible questions.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `course_id` | `uuid` | References `courses.id`. |
| `author_id` | `uuid` | References `profiles.id`. |
| `visibility` | `text` | `internal` or `instructor_visible`. |
| `body` | `text` | Comment text. |
| `parent_comment_id` | `uuid` | Optional self-reference for replies. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Updated when edited. |

Relationships:

- Belongs to a course.
- Belongs to an author profile.
- Can reply to another comment.

MVP permissions:

- Internal users can read internal comments for accessible courses.
- Instructor can only read instructor-visible comments for assigned courses.
- Instructor questions should use `instructor_visible`.

Open decisions:

- Whether comments need resolved/unresolved state.
- Whether comments should attach to specific review sections.

## `review_invites`

Purpose:
Stores course-scoped instructor invite links.

This supports instructors receiving a secure link for a specific review package.

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `course_id` | `uuid` | References `courses.id`. |
| `email` | `text` | Instructor email. |
| `token_hash` | `text` | Hash of invite token, not raw token. |
| `created_by` | `uuid` | References `profiles.id`. |
| `expires_at` | `timestamptz` | Invite expiration. |
| `accepted_at` | `timestamptz` | When instructor accepted. Nullable. |
| `revoked_at` | `timestamptz` | When invite was revoked. Nullable. |
| `created_at` | `timestamptz` | Default `now()`. |

Relationships:

- Belongs to a course.
- Created by a profile.
- May correspond to an Instructor profile after login.

MVP permissions:

- Admin, Communications, and Super Admin can create invites for ready courses.
- Instructor can use a valid invite only for the linked course.
- Raw tokens should not be stored.

Open decisions:

- Whether Supabase magic links alone are enough, or whether separate invite tokens are needed.
- Whether invites should be one-time use.

## MVP Query Needs

The first schema should support these queries:

1. Get my profile and role.
2. Get courses assigned to me.
3. Get courses waiting for Admin review.
4. Get courses ready for Communications.
5. Get course detail with assignments.
6. Get review sections in display order.
7. Get review responses for a course.
8. Get internal comments for internal users.
9. Get instructor-visible comments for instructors.
10. Get status history for a course.
11. Validate an instructor invite for a course.

## Indexes To Consider

Initial indexes:

- `profiles(email)`
- `profiles(role)`
- `courses(status)`
- `courses(created_by)`
- `course_assignments(course_id)`
- `course_assignments(profile_id)`
- `course_assignments(course_id, profile_id)`
- `course_status_events(course_id, created_at)`
- `review_sections(sort_order)`
- `review_responses(course_id)`
- `review_responses(course_id, section_id)`
- `course_comments(course_id, created_at)`
- `course_comments(course_id, visibility)`
- `review_invites(course_id)`
- `review_invites(email)`
- `review_invites(token_hash)`

## Deferred Until Later

Do not add these yet:

- File attachments.
- Cloudflare R2 object metadata.
- PDF export jobs.
- Notifications.
- Realtime delivery receipts.
- Course import batches.
- Department table.
- Term table.
- Review template versioning.
- Advanced audit event taxonomy.
- Analytics/reporting tables.

## Open Questions For Review

1. Should Communications users have explicit course assignments or role-wide access to all courses in `ready_for_instructor`?
2. Should Admin be allowed to send directly to Instructor, or should only Communications do that?
3. Should `review_responses.response_data` start as `jsonb`, or should we define field-level tables immediately?
4. Should instructors need separate invite tokens, or will Supabase magic links plus `course_assignments` be enough?
5. Should Instructor see status history, or only the current review package and visible comments?
6. Should Admin and Communications be separate roles forever, or should Communications be an Admin capability later?
