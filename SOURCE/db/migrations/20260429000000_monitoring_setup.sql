-- Enable pg_stat_statements so Supabase Dashboard → Database → Query Performance works.
-- This extension is available on all Supabase projects but must be explicitly enabled.
create extension if not exists pg_stat_statements;

-- ─── Slow query helper ───────────────────────────────────────────────────────
-- View the top 20 slowest queries in the Supabase SQL editor.
-- Useful for spotting missing indexes before they become user-facing.
--
--   SELECT * FROM monitoring.slow_queries;
--
create schema if not exists monitoring;

create or replace view monitoring.slow_queries as
select
  round(mean_exec_time::numeric, 2)        as avg_ms,
  round(total_exec_time::numeric, 2)        as total_ms,
  calls,
  round(stddev_exec_time::numeric, 2)       as stddev_ms,
  rows,
  left(query, 120)                          as query_preview
from pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by mean_exec_time desc
limit 20;

-- ─── Course status distribution ──────────────────────────────────────────────
-- Quick snapshot of how courses are spread across workflow statuses.
-- Pin this in the Supabase Table Editor or run it from the SQL editor.
--
--   SELECT * FROM monitoring.course_status_counts;
--
create or replace view monitoring.course_status_counts as
select
  status,
  count(*)              as total,
  round(
    count(*) * 100.0 / nullif(sum(count(*)) over (), 0),
    1
  )                     as pct
from courses
group by status
order by
  case status
    when 'course_created'          then 1
    when 'assigned_to_ta'          then 2
    when 'ta_review_in_progress'   then 3
    when 'submitted_to_admin'      then 4
    when 'admin_changes_requested' then 5
    when 'ready_for_instructor'    then 6
    when 'sent_to_instructor'      then 7
    when 'instructor_questions'    then 8
    when 'instructor_approved'     then 9
    when 'final_approved'          then 10
  end;

-- ─── Stuck courses ───────────────────────────────────────────────────────────
-- Courses that haven't moved status in >5 days.
-- Run from SQL editor or wire up a pg_cron job to email weekly.
--
--   SELECT * FROM monitoring.stuck_courses;
--
create or replace view monitoring.stuck_courses as
select
  c.id,
  c.title,
  c.status,
  c.updated_at,
  now() - c.updated_at                    as time_stuck,
  extract(day from now() - c.updated_at)  as days_stuck
from courses c
where c.updated_at < now() - interval '5 days'
  and c.status != 'final_approved'
order by c.updated_at asc;

-- ─── TA workload snapshot ────────────────────────────────────────────────────
-- How many active courses each TA currently owns.
--
--   SELECT * FROM monitoring.ta_workload;
--
create or replace view monitoring.ta_workload as
select
  p.id            as profile_id,
  p.full_name,
  p.email,
  count(ca.id)    as active_courses,
  count(ca.id) filter (
    where c.status = 'admin_changes_requested'
  )               as needs_fixes
from profiles p
left join course_assignments ca
  on ca.profile_id = p.id and ca.role = 'ta'
left join courses c
  on c.id = ca.course_id
  and c.status not in ('submitted_to_admin', 'final_approved')
where p.role = 'ta'
group by p.id, p.full_name, p.email
order by active_courses desc;

-- Grant read access to monitoring views for the authenticated role
-- (Supabase dashboard queries run as postgres so these are readable there too)
grant usage on schema monitoring to authenticated;
grant select on all tables in schema monitoring to authenticated;
