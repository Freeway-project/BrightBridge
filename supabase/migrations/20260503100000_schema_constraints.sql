begin;

-- Lock org unit types to the 3 used in this single-institution deployment
alter table public.organizational_units
  add constraint organizational_units_type_check
  check (type in ('college', 'school', 'department'));

-- Lock position titles to the actual set in use at Okanagan College
alter table public.org_unit_members
  add constraint org_unit_members_title_check
  check (title in ('vp', 'associate_dean', 'dept_head', 'admin'));

-- Drop 'instructor' from profiles.role
-- All real faculty are standard_user; the course-level instructor role
-- is already tracked separately in course_assignments.role
update public.profiles set role = 'standard_user' where role = 'instructor';
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin_full', 'admin_viewer', 'standard_user'));

commit;
