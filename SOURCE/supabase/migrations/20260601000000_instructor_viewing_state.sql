-- Instructor viewing state: add instructor_viewing
--
-- Sits between sent_to_instructor and the instructor's response. It is set
-- automatically when the instructor opens their emailed review link:
--   sent_to_instructor
--     -> instructor_viewing     (instructor opened the link)
--       -> instructor_questions (instructor raises a question)
--       -> instructor_approved  (instructor approves)
--
-- Only the courses.status and course_status_events.{from,to}_status CHECK
-- constraints enumerate status values, plus can_read_course() which gates
-- admin_viewer (Comms) read access by status — all updated below.

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
    'instructor_viewing',
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
    'instructor_viewing',
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
    'instructor_viewing',
    'instructor_questions',
    'instructor_approved',
    'final_approved'
  )
);

-- Keep Comms (admin_viewer) able to read the course while the instructor is viewing.
create or replace function public.can_read_course(_course_id uuid, _course_status text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_admin_role()
    or public.is_assigned_to_course(_course_id)
    or (
      public.current_app_role() = 'admin_viewer'
      and _course_status in (
        'ready_for_instructor','sent_to_instructor','instructor_viewing',
        'instructor_questions','instructor_approved','final_approved'
      )
    ),
    false
  );
$$;

commit;
