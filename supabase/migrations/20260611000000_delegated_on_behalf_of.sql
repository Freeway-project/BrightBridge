-- Hierarchy delegation: record when an org-hierarchy leader (dean / dept-head /
-- etc.) acts on an instructor's behalf. The actor stays the leader's own profile
-- (actor_id / author_id), and acting_on_behalf_of points at the *assigned
-- instructor* the leader stood in for. NULL = a normal, non-delegated action.
--
-- We add a real nullable FK column (rather than smuggling the id into a note /
-- body) on each of the three reader surfaces so the on-behalf identity is
-- queryable and joinable the same way the author is:
--   * course_status_events  — the canonical status timeline
--   * course_comments       — the shared discussion thread the TA reads
--   * course_issue_comments — issue / question threads
--
-- actor_role is deliberately left as-is (still 'instructor'); its CHECK
-- constraint only accepts the six profile roles, so writing a title would 500.
-- The leader's title is surfaced for display by joining org_unit_members.
--
-- The audit_log trigger captures whole-row to_jsonb(new) on all three tables,
-- so the new column flows into audit_log.new_data automatically — no trigger
-- change needed.
--
-- PORT NOTE (Supabase -> Postgres/Azure lineage): mirror these three nullable
-- ADD COLUMNs in the pg track. Kept minimal (no backfill, no constraint changes)
-- so the port is mechanical. See docs/instructor-port-log.md.

begin;

alter table public.course_status_events
  add column if not exists acting_on_behalf_of uuid references public.profiles(id);

alter table public.course_comments
  add column if not exists acting_on_behalf_of uuid references public.profiles(id);

alter table public.course_issue_comments
  add column if not exists acting_on_behalf_of uuid references public.profiles(id);

comment on column public.course_status_events.acting_on_behalf_of is
  'When set, the actor performed this transition on behalf of this (assigned instructor) profile via org-hierarchy delegation. NULL for normal actions.';
comment on column public.course_comments.acting_on_behalf_of is
  'When set, the author posted on behalf of this (assigned instructor) profile via org-hierarchy delegation. NULL for normal comments.';
comment on column public.course_issue_comments.acting_on_behalf_of is
  'When set, the author posted on behalf of this (assigned instructor) profile via org-hierarchy delegation. NULL for normal comments.';

commit;
