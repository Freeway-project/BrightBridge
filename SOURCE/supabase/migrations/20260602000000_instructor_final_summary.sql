-- Final Summary for Instructor
--
-- A single free-text summary the TA writes for the instructor during the
-- staging phase (waiting_on_admin / staging_in_progress). It is surfaced in the
-- Issues tab and shown to the instructor in the sign-off step. Reads are already
-- covered by can_read_course() / is_assigned_to_course(); writes go through a
-- role- and status-gated server action using the service-role client, so no new
-- RLS policy is required.

alter table public.courses
  add column if not exists instructor_summary_notes text;
