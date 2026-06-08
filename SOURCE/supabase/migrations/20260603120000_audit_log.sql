-- Generic audit trail: capture every mutation going forward (new) and backfill
-- the history we already have (back).
--
-- WHY DB TRIGGERS (not app-layer events):
--   Mutations reach these tables through many paths — server actions,
--   repositories, AND bulk migration/import scripts that run as the service
--   role and bypass the app entirely. A row-level trigger fires for all of
--   them, so coverage never depends on remembering to log in each code path.
--   (This is the gap that left assignments, issues, escalations, comments and
--   review responses with no trace.)
--
-- RELATIONSHIP TO course_status_events:
--   course_status_events stays the canonical *status* trail (it carries the
--   actor note and feeds the workflow). audit_log COMPLEMENTS it with
--   column-level before/after for everything else. The status change also
--   lands in audit_log via the courses trigger, so the timeline can union both
--   and prefer course_status_events for status rows.

begin;

-- ---------------------------------------------------------------------------
-- 1. Storage
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  row_id      uuid,
  course_id   uuid references public.courses(id) on delete set null,
  action      text not null check (action in ('INSERT','UPDATE','DELETE','BACKFILL')),
  actor_id    uuid,                                   -- auth.uid() at change time; null for system/migration
  actor_role  text,                                   -- current_app_role() when available
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz not null default now()
);

comment on table public.audit_log is
  'Generic mutation audit trail. Populated by trigger public.audit_capture() on key tables, plus a one-time backfill. Complements course_status_events (which remains the canonical status trail).';

create index if not exists audit_log_course_changed_idx on public.audit_log (course_id, changed_at desc);
create index if not exists audit_log_table_row_idx       on public.audit_log (table_name, row_id);
create index if not exists audit_log_changed_at_idx      on public.audit_log (changed_at desc);

-- RLS: only admin roles may read; clients can never write. The trigger function
-- is SECURITY DEFINER, so its inserts run as the table owner and bypass RLS —
-- meaning there is intentionally no INSERT policy here.
alter table public.audit_log enable row level security;

drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select using (public.is_admin_role());

-- ---------------------------------------------------------------------------
-- 2. Capture function + triggers  (the "new" coverage)
-- ---------------------------------------------------------------------------
create or replace function public.audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old       jsonb;
  v_new       jsonb;
  v_row       jsonb;
  v_row_id    uuid;
  v_course_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old); v_new := null;          v_row := v_old;
  elsif (tg_op = 'UPDATE') then
    v_old := to_jsonb(old); v_new := to_jsonb(new);  v_row := v_new;
  else -- INSERT
    v_old := null;          v_new := to_jsonb(new);  v_row := v_new;
  end if;

  v_row_id := nullif(v_row->>'id','')::uuid;

  -- Resolve the owning course. Join tables (issue comments, escalation
  -- messages) look it up; the courses table is its own id; the rest carry a
  -- direct course_id column.
  v_course_id := case tg_table_name
    when 'course_issue_comments' then
      (select course_id from public.course_issues where id = nullif(v_row->>'issue_id','')::uuid)
    when 'escalation_messages' then
      (select course_id from public.course_escalations where id = nullif(v_row->>'escalation_id','')::uuid)
    when 'courses' then v_row_id
    else nullif(v_row->>'course_id','')::uuid
  end;

  insert into public.audit_log
    (table_name, row_id, course_id, action, actor_id, actor_role, old_data, new_data)
  values
    (tg_table_name, v_row_id, v_course_id, tg_op, auth.uid(), public.current_app_role(), v_old, v_new);

  return null; -- AFTER trigger: return value is ignored
end;
$$;

-- Attach to every table whose mutations were previously untraced.
do $$
declare
  t text;
  audited_tables text[] := array[
    'courses',
    'course_assignments',
    'course_comments',
    'course_issues',
    'course_issue_comments',
    'course_escalations',
    'escalation_messages',
    'review_responses',
    'profiles',
    'organizational_units',
    'org_unit_members'
  ];
begin
  foreach t in array audited_tables loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s '
      'for each row execute function public.audit_capture()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill existing rows  (the "back" coverage)
-- ---------------------------------------------------------------------------
-- We only have current state, not full change history, so we reconstruct the
-- creation event for each row (and a second "resolved" event for issues /
-- escalations that carry resolved_at). changed_at uses the row's own timestamp
-- so the backfilled history sits at the right point on the timeline.

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_assignments', a.id, a.course_id, 'BACKFILL', a.assigned_by, to_jsonb(a), coalesce(a.assigned_at, now())
from public.course_assignments a;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_comments', c.id, c.course_id, 'BACKFILL', c.author_id, to_jsonb(c), coalesce(c.created_at, now())
from public.course_comments c;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_issues', i.id, i.course_id, 'BACKFILL', i.created_by, to_jsonb(i), coalesce(i.created_at, now())
from public.course_issues i;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_issues', i.id, i.course_id, 'BACKFILL', i.resolved_by,
       jsonb_build_object('event','resolved','status', i.status), i.resolved_at
from public.course_issues i
where i.resolved_at is not null;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_issue_comments', cc.id, ci.course_id, 'BACKFILL', cc.author_id, to_jsonb(cc), coalesce(cc.created_at, now())
from public.course_issue_comments cc
left join public.course_issues ci on ci.id = cc.issue_id;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_escalations', e.id, e.course_id, 'BACKFILL', e.created_by, to_jsonb(e), coalesce(e.created_at, now())
from public.course_escalations e;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'course_escalations', e.id, e.course_id, 'BACKFILL', e.resolved_by,
       jsonb_build_object('event','resolved','status', e.status), e.resolved_at
from public.course_escalations e
where e.resolved_at is not null;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'escalation_messages', m.id, ce.course_id, 'BACKFILL', m.author_id, to_jsonb(m), coalesce(m.created_at, now())
from public.escalation_messages m
left join public.course_escalations ce on ce.id = m.escalation_id;

insert into public.audit_log (table_name, row_id, course_id, action, actor_id, new_data, changed_at)
select 'review_responses', r.id, r.course_id, 'BACKFILL', r.responded_by, to_jsonb(r), coalesce(r.created_at, now())
from public.review_responses r;

insert into public.audit_log (table_name, row_id, action, actor_role, new_data, changed_at)
select 'profiles', p.id, 'BACKFILL', p.role, to_jsonb(p), coalesce(p.created_at, now())
from public.profiles p;

insert into public.audit_log (table_name, row_id, action, new_data, changed_at)
select 'organizational_units', u.id, 'BACKFILL', to_jsonb(u), coalesce(u.created_at, now())
from public.organizational_units u;

insert into public.audit_log (table_name, row_id, action, new_data, changed_at)
select 'org_unit_members', m.id, 'BACKFILL', to_jsonb(m), coalesce(m.created_at, now())
from public.org_unit_members m;

commit;
