-- Optimize staff dashboard and admin list query paths.

create index if not exists courses_updated_at_desc_idx
  on public.courses (updated_at desc);

create index if not exists courses_status_updated_at_desc_idx
  on public.courses (status, updated_at desc);

create index if not exists course_assignments_profile_role_course_idx
  on public.course_assignments (profile_id, role, course_id);

create index if not exists course_issues_course_status_idx
  on public.course_issues (course_id, status);
