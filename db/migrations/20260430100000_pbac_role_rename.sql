begin;

-- profiles.role
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'standard_user' where role = 'ta';
update public.profiles set role = 'admin_full'    where role = 'admin';
update public.profiles set role = 'admin_viewer'  where role = 'communications';
-- instructor and super_admin rows are unchanged
alter table public.profiles add constraint profiles_role_check check (
  role in ('super_admin', 'admin_full', 'admin_viewer', 'standard_user', 'instructor')
);

-- course_assignments.role
alter table public.course_assignments drop constraint course_assignments_role_check;
update public.course_assignments set role = 'staff' where role = 'ta';
delete from public.course_assignments where role not in ('staff', 'instructor');
alter table public.course_assignments add constraint course_assignments_role_check check (
  role in ('staff', 'instructor')
);

-- course_status_events.actor_role
alter table public.course_status_events drop constraint course_status_events_actor_role_check;
update public.course_status_events set actor_role = 'standard_user' where actor_role = 'ta';
update public.course_status_events set actor_role = 'admin_full'    where actor_role = 'admin';
update public.course_status_events set actor_role = 'admin_viewer'  where actor_role = 'communications';
alter table public.course_status_events add constraint course_status_events_actor_role_check check (
  actor_role in ('super_admin', 'admin_full', 'admin_viewer', 'standard_user', 'instructor')
);

-- Auto-signup trigger: default role standard_user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email), 'standard_user')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- RLS helper: is_admin_role() updated to use new role strings
create or replace function public.is_admin_role()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('admin_full', 'super_admin'), false);
$$;

-- RLS helper: can_read_course() updated for admin_viewer (was communications)
create or replace function public.can_read_course(_course_id uuid, _course_status text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_admin_role()
    or public.is_assigned_to_course(_course_id)
    or (
      public.current_app_role() = 'admin_viewer'
      and _course_status in (
        'ready_for_instructor','sent_to_instructor',
        'instructor_questions','instructor_approved','final_approved'
      )
    ),
    false
  );
$$;

-- Monitoring: ta_workload view — update role filters
drop view if exists monitoring.ta_workload;
create view monitoring.ta_workload as
select
  p.id, p.full_name, p.email,
  count(ca.id) as active_courses,
  count(ca.id) filter (where c.status = 'admin_changes_requested') as needs_fixes
 from profiles p
 left join course_assignments ca on ca.profile_id = p.id and ca.role = 'staff'
 left join courses c on c.id = ca.course_id
   and c.status not in ('submitted_to_admin', 'final_approved')
 where p.role = 'standard_user'
 group by p.id, p.full_name, p.email
 order by active_courses desc;

commit;
