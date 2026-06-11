-- Staging phase states: add waiting_on_admin and staging_in_progress
--
-- These two statuses sit between admin approval (submitted_to_admin) and
-- ready_for_instructor, matching the documented staging phase:
--   submitted_to_admin
--     -> waiting_on_admin     (admin builds the staging shell)
--     -> staging_in_progress  (TA finalizes the course)
--     -> ready_for_instructor
--
-- Only the courses.status and course_status_events.{from,to}_status CHECK
-- constraints enumerate status values, so those are the only objects to update.
-- RLS (can_read_course) and the stats views intentionally do not list these
-- internal admin/TA statuses: Comms (admin_viewer) stays gated to
-- ready_for_instructor+, TAs read via assignment, and both new statuses already
-- count as active in dashboard_stats / monitoring.ta_workload.

begin;

alter table public.courses drop constraint courses_status_check;
alter table public.courses add constraint courses_status_check check (
  status in (
    'course_created',
    'assigned_to_ta',
    'ta_review_in_progress',
    'submitted_to_admin',
    'admin_changes_requested',
    'waiting_on_admin',
    'staging_in_progress',
    'ready_for_instructor',
    'sent_to_instructor',
    'instructor_questions',
    'instructor_approved',
    'final_approved'
  )
);

alter table public.course_status_events drop constraint course_status_events_from_status_check;
alter table public.course_status_events add constraint course_status_events_from_status_check check (
  from_status is null
  or from_status in (
    'course_created',
    'assigned_to_ta',
    'ta_review_in_progress',
    'submitted_to_admin',
    'admin_changes_requested',
    'waiting_on_admin',
    'staging_in_progress',
    'ready_for_instructor',
    'sent_to_instructor',
    'instructor_questions',
    'instructor_approved',
    'final_approved'
  )
);

alter table public.course_status_events drop constraint course_status_events_to_status_check;
alter table public.course_status_events add constraint course_status_events_to_status_check check (
  to_status in (
    'course_created',
    'assigned_to_ta',
    'ta_review_in_progress',
    'submitted_to_admin',
    'admin_changes_requested',
    'waiting_on_admin',
    'staging_in_progress',
    'ready_for_instructor',
    'sent_to_instructor',
    'instructor_questions',
    'instructor_approved',
    'final_approved'
  )
);

commit;
