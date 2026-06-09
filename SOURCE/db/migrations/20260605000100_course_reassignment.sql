-- Course reassignment: swap a course's TA (staff) atomically and keep a durable
-- trace. WHY a dedicated table + RPC (not the generic audit_log trigger):
--   * audit_log records actor via auth.uid(), which is NULL for our service-role
--     writes — so "who reassigned" would be lost there. This table captures the
--     actor (reassigned_by) and an optional reason explicitly.
--   * The swap is delete-old-implied + add-new; doing it as one in-place UPDATE
--     inside one transaction guarantees a course is never left without a TA.
-- The generic audit_log trigger on course_assignments still fires on top of this.

begin;

-- 1. Trace table -----------------------------------------------------------
create table if not exists public.course_reassignments (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  from_profile_id  uuid references public.profiles(id) on delete set null,
  to_profile_id    uuid not null references public.profiles(id) on delete set null,
  reassigned_by    uuid references public.profiles(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now()
);

comment on table public.course_reassignments is
  'Durable trace of course TA reassignments (who/from/to/when/why). Written only by reassign_course_staff(); also the source for reassignment notifications.';

create index if not exists course_reassignments_to_created_idx
  on public.course_reassignments (to_profile_id, created_at desc);
create index if not exists course_reassignments_course_created_idx
  on public.course_reassignments (course_id, created_at desc);

alter table public.course_reassignments enable row level security;

-- Admins read all; a TA reads rows where they are the new assignee.
drop policy if exists course_reassignments_admin_read on public.course_reassignments;
create policy course_reassignments_admin_read on public.course_reassignments
  for select using (public.is_admin_role());

drop policy if exists course_reassignments_assignee_read on public.course_reassignments;
create policy course_reassignments_assignee_read on public.course_reassignments
  for select using (to_profile_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER RPC writes.

-- 2. Transactional swap RPC ------------------------------------------------
create or replace function public.reassign_course_staff(
  p_course_id      uuid,
  p_new_profile_id uuid,
  p_actor_id       uuid,
  p_reason         text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_profile_id uuid;
begin
  -- Lock the current staff row so concurrent reassigns serialize.
  select profile_id into v_old_profile_id
  from public.course_assignments
  where course_id = p_course_id and role = 'staff'
  for update;

  if v_old_profile_id is null then
    raise exception 'Course has no current TA to reassign';
  end if;

  if v_old_profile_id = p_new_profile_id then
    raise exception 'Course is already assigned to this TA';
  end if;

  -- In-place swap: atomic, preserves the one-staff-per-course invariant, and the
  -- audit_log UPDATE trigger fires with old/new profile_id.
  update public.course_assignments
  set profile_id  = p_new_profile_id,
      assigned_by = p_actor_id,
      assigned_at = now()
  where course_id = p_course_id and role = 'staff';

  insert into public.course_reassignments
    (course_id, from_profile_id, to_profile_id, reassigned_by, reason)
  values
    (p_course_id, v_old_profile_id, p_new_profile_id, p_actor_id, nullif(btrim(p_reason), ''));
end;
$$;

-- Only the service role (server actions) may execute it; the app-layer
-- requireAnyRole check is the authorization gate.
revoke all on function public.reassign_course_staff(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reassign_course_staff(uuid, uuid, uuid, text) to service_role;

-- 3. Realtime: let clients subscribe to reassignment inserts for toasts.
alter publication supabase_realtime add table public.course_reassignments;

commit;
