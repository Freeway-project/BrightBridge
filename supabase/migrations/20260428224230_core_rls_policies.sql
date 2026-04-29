-- Minimal core RLS guardrails for CourseBridge.
-- Business workflow checks stay in TypeScript server logic.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'super_admin'), false);
$$;

create or replace function public.is_assigned_to_course(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_assignments ca
    where ca.course_id = _course_id
      and ca.profile_id = auth.uid()
  );
$$;

create or replace function public.can_read_course(_course_id uuid, _course_status text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin_role()
    or public.is_assigned_to_course(_course_id)
    or (
      public.current_app_role() = 'communications'
      and _course_status in (
        'ready_for_instructor',
        'sent_to_instructor',
        'instructor_questions',
        'instructor_approved',
        'final_approved'
      )
    ),
    false
  );
$$;

create or replace function public.can_read_course_by_id(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = _course_id
      and public.can_read_course(c.id, c.status)
  );
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin_role() from public;
revoke all on function public.is_assigned_to_course(uuid) from public;
revoke all on function public.can_read_course(uuid, text) from public;
revoke all on function public.can_read_course_by_id(uuid) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin_role() to authenticated;
grant execute on function public.is_assigned_to_course(uuid) to authenticated;
grant execute on function public.can_read_course(uuid, text) to authenticated;
grant execute on function public.can_read_course_by_id(uuid) to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin_role());

drop policy if exists "Users can read accessible courses" on public.courses;
create policy "Users can read accessible courses"
on public.courses
for select
to authenticated
using (public.can_read_course(id, status));

drop policy if exists "Users can read relevant assignments" on public.course_assignments;
create policy "Users can read relevant assignments"
on public.course_assignments
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_admin_role()
  or public.can_read_course_by_id(course_id)
);

drop policy if exists "Users can read accessible course status events" on public.course_status_events;
create policy "Users can read accessible course status events"
on public.course_status_events
for select
to authenticated
using (
  public.can_read_course_by_id(course_id)
);
