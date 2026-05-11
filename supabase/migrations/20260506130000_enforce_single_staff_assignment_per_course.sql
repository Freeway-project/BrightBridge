-- Enforce one TA/staff assignment per course.
-- Existing uniqueness on (course_id, profile_id, role) remains to keep assignment writes idempotent per user.
create unique index if not exists course_assignments_one_staff_per_course_idx
  on public.course_assignments (course_id)
  where role = 'staff';
