-- Bulk reset: collapse the staging phase into a single `staging_in_progress`
-- column so the assigned staff member makes the two-way decision:
--   * Mark Ready for Instructor  (staging_in_progress -> ready_for_instructor)
--   * Mark Provision Complete    (staging_in_progress -> final_approved, skips instructor)
--
-- Scope (per product decision): waiting_on_admin + ready_for_instructor +
-- admin_changes_requested move to staging_in_progress. Migration-phase,
-- instructor-phase, and final_approved courses are untouched.
--
-- Reversible: see scripts/sql/rollback_staging_reset_20260605.sql
-- Sequencing: deploy the app code (new transition + UI) BEFORE running this.

begin;

-- Guard: we attribute the canonical status events to a system super_admin actor.
do $$
begin
  if not exists (select 1 from public.profiles where role = 'super_admin') then
    raise exception 'No super_admin profile found to attribute the bulk reset events to';
  end if;
end $$;

-- 1. Snapshot prior status for rollback.
create table if not exists public.courses_status_backup_20260605 (
  course_id   uuid primary key references public.courses(id),
  old_status  text not null,
  captured_at timestamptz not null default now()
);

insert into public.courses_status_backup_20260605 (course_id, old_status)
select id, status
from public.courses
where status in ('waiting_on_admin', 'ready_for_instructor', 'admin_changes_requested')
on conflict (course_id) do nothing;

-- 2. Write the canonical status-event trail. The bulk UPDATE below bypasses the
--    app's transitionCourseStatus (which normally records these), so insert them
--    explicitly. Read the old status BEFORE the UPDATE so from_status is truthful.
insert into public.course_status_events (course_id, from_status, to_status, actor_id, actor_role, note)
select
  c.id,
  c.status,
  'staging_in_progress',
  sa.id,
  'super_admin',
  'Bulk reset to staging_in_progress for new staff decision workflow'
from public.courses c
cross join lateral (
  select id from public.profiles where role = 'super_admin' order by created_at limit 1
) sa
where c.status in ('waiting_on_admin', 'ready_for_instructor', 'admin_changes_requested');

-- 3. The move. The trg_audit_courses trigger (20260603120000_audit_log.sql)
--    captures before/after JSONB per affected row in public.audit_log.
update public.courses
set status = 'staging_in_progress', updated_at = now()
where status in ('waiting_on_admin', 'ready_for_instructor', 'admin_changes_requested');

commit;
