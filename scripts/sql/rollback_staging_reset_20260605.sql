-- Rollback for 20260605000000_bulk_reset_staging_to_in_progress.sql
--
-- Restores each course to the status captured in the snapshot table, but ONLY
-- for courses still sitting in staging_in_progress. Any course a staff member
-- has already acted on (pushed to ready_for_instructor or final_approved) is
-- left alone, so a late rollback cannot clobber real progress.
--
-- Run manually (NOT an auto-applied migration). Review the SELECT preview first.

-- Preview what would be reverted:
-- select c.id, c.status as current_status, b.old_status
-- from public.courses c
-- join public.courses_status_backup_20260605 b on b.course_id = c.id
-- where c.status = 'staging_in_progress';

begin;

update public.courses c
set status = b.old_status, updated_at = now()
from public.courses_status_backup_20260605 b
where c.id = b.course_id
  and c.status = 'staging_in_progress';

commit;

-- Optionally, after verifying, drop the snapshot table:
-- drop table if exists public.courses_status_backup_20260605;
