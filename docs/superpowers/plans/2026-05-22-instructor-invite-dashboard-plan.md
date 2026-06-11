# Instructor Invite Dashboard Plan - 2026-05-22

## Goal

Design and implement the instructor handoff flow where TA/admin/communications sends a completed course to an instructor, the instructor receives a unique email link, lands in their dashboard, reviews assigned courses, asks questions, and approves.

## Core Decision

Do not treat the email link as permanent identity. Course access should come from `course_assignments`. The invite link should only help the instructor enter the system, validate email/course access, and record tracking events.

Use long-lived, revocable invite links instead of unbounded bearer access. Store only token hashes in the database.

## Recommended Flow

1. Course reaches `ready_for_instructor`.
2. Admin/communications clicks send to instructor.
3. App verifies an instructor assignment exists for the course.
4. App creates or updates a `review_invites` record.
5. App sends email with a link like `/instructor/invite/<token>`.
6. Invite route validates token hash, email, revocation state, and course status.
7. Instructor lands on `/instructor`.
8. Dashboard shows all courses assigned to that instructor email/profile, not only the course from the email.

## Instructor Dashboard

Show a course list with:

- Course title/code/term
- Current status
- Last activity
- Unread instructor-visible messages
- Action state: needs review, questions sent, approved

Use course detail pages for actual review:

- `/instructor/courses/[id]`
- Review package
- Instructor-visible conversation
- Ask question action
- Approve action

## Conversation Decision

Use per-course conversation, not one global chat. A global dashboard feed can aggregate recent activity, but the source of truth should be course-scoped.

Visibility:

- `internal`: TA/admin only
- `instructor_visible`: instructor + TA/admin/communications/superadmin

## Workflow

```text
ready_for_instructor
  -> sent_to_instructor
      email invite sent

sent_to_instructor
  -> instructor_questions
      instructor posts question

instructor_questions
  -> sent_to_instructor
      TA/admin replies and sends back

sent_to_instructor
  -> instructor_approved
      instructor approves

instructor_approved
  -> final_approved
      admin/superadmin finalizes
```

## Tracking For Super Admin

Track:

- Instructor email
- Course
- Sent by
- Sent count
- Last sent at
- Click count
- First clicked at
- Last clicked at
- Dashboard viewed at
- Course viewed at
- Question asked at
- Review approved at
- Current course status

Open tracking is unreliable because email clients block pixels. Click tracking is more reliable.

Possible event table:

```text
instructor_invite_events
- id
- invite_id
- course_id
- instructor_email
- event_type: sent | opened | clicked | accepted | dashboard_viewed | course_viewed | approved | question_submitted
- actor_profile_id nullable
- user_agent nullable
- ip_hash nullable
- created_at
```

## Suggested Implementation Order

1. Confirm current schema for `review_invites`, `course_comments`, and instructor assignments.
2. Build instructor dashboard list from `course_assignments`.
3. Add invite creation/send logging to send-to-instructor action.
4. Add invite accept route that validates token and redirects to dashboard.
5. Add instructor course review page.
6. Add instructor-visible per-course conversation.
7. Add ask-question and approve actions.
8. Add super admin tracking view.

## Security Notes

- Store invite token hash, not raw token.
- Keep `revoked_at` even if links do not expire.
- Do PBAC checks in server actions/repositories.
- Instructor must only see courses assigned to their profile/email and only instructor-visible comments.
