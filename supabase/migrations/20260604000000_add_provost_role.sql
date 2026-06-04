-- Add 'provost' as a top-of-hierarchy global role.
-- Provost = institution-wide oversight (sees all colleges/courses) + org-chart
-- management. It is a global profile role, not attached to an org unit.

begin;

-- Allow provost on profiles.role
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'super_admin', 'provost', 'admin_full', 'admin_viewer', 'standard_user', 'instructor'
  ));

-- A provost acting on a course records status events with actor_role = 'provost',
-- so the actor_role check must accept it too.
alter table public.course_status_events drop constraint course_status_events_actor_role_check;
alter table public.course_status_events add constraint course_status_events_actor_role_check
  check (actor_role in (
    'super_admin', 'provost', 'admin_full', 'admin_viewer', 'standard_user', 'instructor'
  ));

commit;
