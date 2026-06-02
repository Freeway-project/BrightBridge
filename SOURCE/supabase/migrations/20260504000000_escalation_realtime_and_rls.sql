-- Fix is_admin_role() to match actual role names (admin_full, not admin)
create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin_full', 'super_admin'), false);
$$;

-- RLS: course_escalations
alter table public.course_escalations enable row level security;

-- Admins can read all escalations
drop policy if exists "Admins can read all escalations" on public.course_escalations;
create policy "Admins can read all escalations"
on public.course_escalations
for select
to authenticated
using (public.is_admin_role());

-- Assigned users (TA) can read escalations on their courses
drop policy if exists "Assigned users can read course escalations" on public.course_escalations;
create policy "Assigned users can read course escalations"
on public.course_escalations
for select
to authenticated
using (public.is_assigned_to_course(course_id));

-- Authors can always read their own escalations
drop policy if exists "Authors can read own escalations" on public.course_escalations;
create policy "Authors can read own escalations"
on public.course_escalations
for select
to authenticated
using (created_by = auth.uid());

-- RLS: escalation_messages
alter table public.escalation_messages enable row level security;

-- Admins can read all messages
drop policy if exists "Admins can read all escalation messages" on public.escalation_messages;
create policy "Admins can read all escalation messages"
on public.escalation_messages
for select
to authenticated
using (public.is_admin_role());

-- Users who can read the escalation can read its messages
drop policy if exists "Participants can read escalation messages" on public.escalation_messages;
create policy "Participants can read escalation messages"
on public.escalation_messages
for select
to authenticated
using (
  exists (
    select 1 from public.course_escalations e
    where e.id = escalation_id
      and (
        e.created_by = auth.uid()
        or public.is_assigned_to_course(e.course_id)
        or public.is_admin_role()
      )
  )
);

-- Enable Realtime for both tables
alter publication supabase_realtime add table public.course_escalations;
alter publication supabase_realtime add table public.escalation_messages;
