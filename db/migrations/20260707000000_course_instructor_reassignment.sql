-- Course instructor assignment/reassignment: set or swap a course's instructor
-- atomically and keep a durable, actor-preserving trace.
--
-- WHY a dedicated table + RPC (mirrors course_reassignments for staff/TA):
--   * The generic audit_log trigger on course_assignments records the actor via
--     auth.uid(), which is NULL for our service-role writes — so "who changed the
--     instructor" would be lost there. This table captures the actor
--     (reassigned_by), the from->to pair, and an optional reason explicitly.
--   * "Changing" the instructor was previously an ON CONFLICT upsert with no
--     single-instructor guard, so a different instructor was ADDED rather than
--     swapped, silently leaving the old assignment attached. The partial unique
--     index below makes one-instructor-per-course an invariant, and the RPC does
--     the swap as one in-place UPDATE so a course is never left inconsistent.
-- The generic audit_log trigger on course_assignments still fires on top of this.

begin;

-- ---------------------------------------------------------------------------
-- 0. De-dupe existing multi-instructor courses (keep most-recent) so the
--    one-instructor-per-course index below can be created safely.
-- ---------------------------------------------------------------------------
delete from public.course_assignments ca
using (
  select id,
         row_number() over (
           partition by course_id order by assigned_at desc, id desc
         ) as rn
  from public.course_assignments
  where role = 'instructor'
) ranked
where ca.id = ranked.id
  and ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 1. Enforce one instructor per course (mirror of the staff index).
-- ---------------------------------------------------------------------------
create unique index if not exists course_assignments_one_instructor_per_course_idx
  on public.course_assignments (course_id)
  where role = 'instructor';

-- ---------------------------------------------------------------------------
-- 2. Trace table
-- ---------------------------------------------------------------------------
create table if not exists public.course_instructor_reassignments (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  from_profile_id  uuid references public.profiles(id) on delete set null, -- null = first assignment
  to_profile_id    uuid not null references public.profiles(id) on delete set null,
  reassigned_by    uuid references public.profiles(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now()
);

comment on table public.course_instructor_reassignments is
  'Durable trace of course instructor assignments/changes (who/from/to/when/why). Written only by set_course_instructor(). from_profile_id is null for a first-time assignment.';

create index if not exists course_instructor_reassignments_to_created_idx
  on public.course_instructor_reassignments (to_profile_id, created_at desc);
create index if not exists course_instructor_reassignments_course_created_idx
  on public.course_instructor_reassignments (course_id, created_at desc);

alter table public.course_instructor_reassignments enable row level security;

-- Admins read all; an instructor reads rows where they are the new assignee.
drop policy if exists course_instructor_reassignments_admin_read on public.course_instructor_reassignments;
create policy course_instructor_reassignments_admin_read on public.course_instructor_reassignments
  for select using (public.is_admin_role());

drop policy if exists course_instructor_reassignments_assignee_read on public.course_instructor_reassignments;
create policy course_instructor_reassignments_assignee_read on public.course_instructor_reassignments
  for select using (to_profile_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy: only the SECURITY DEFINER RPC writes.

-- ---------------------------------------------------------------------------
-- 3. Unified assign+swap RPC
-- ---------------------------------------------------------------------------
create or replace function public.set_course_instructor(
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
  -- Lock the current instructor row (if any) so concurrent changes serialize.
  select profile_id into v_old_profile_id
  from public.course_assignments
  where course_id = p_course_id and role = 'instructor'
  for update;

  if v_old_profile_id = p_new_profile_id then
    raise exception 'Course is already assigned to this instructor';
  end if;

  if v_old_profile_id is null then
    -- First-time assignment.
    insert into public.course_assignments (course_id, profile_id, role, assigned_by)
    values (p_course_id, p_new_profile_id, 'instructor', p_actor_id);
  else
    -- In-place swap: atomic, preserves the one-instructor-per-course invariant,
    -- and the audit_log UPDATE trigger fires with old/new profile_id.
    update public.course_assignments
    set profile_id  = p_new_profile_id,
        assigned_by = p_actor_id,
        assigned_at = now()
    where course_id = p_course_id and role = 'instructor';
  end if;

  insert into public.course_instructor_reassignments
    (course_id, from_profile_id, to_profile_id, reassigned_by, reason)
  values
    (p_course_id, v_old_profile_id, p_new_profile_id, p_actor_id, nullif(btrim(p_reason), ''));
end;
$$;

-- Only the service role (server actions) may execute it; the app-layer
-- requireAnyRole check is the authorization gate.
revoke all on function public.set_course_instructor(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_course_instructor(uuid, uuid, uuid, text) to service_role;

commit;
