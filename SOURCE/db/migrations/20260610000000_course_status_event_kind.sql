-- Tag status events as either a normal "transition" (default) or an
-- "admin_override" so the audit timeline can render them distinctly and
-- enforce a non-trivial reason on overrides.
--
-- Why a check constraint on the note: an override without a recorded reason
-- defeats the entire point of distinguishing it from a normal transition.
-- The server validates the reason at length >= 10 before hitting the DB;
-- this constraint is the last line of defence.

begin;

alter table public.course_status_events
  add column if not exists kind text not null default 'transition'
  check (kind in ('transition','admin_override'));

alter table public.course_status_events
  drop constraint if exists course_status_events_override_requires_note;

alter table public.course_status_events
  add constraint course_status_events_override_requires_note
  check (kind = 'transition' or (note is not null and length(trim(note)) >= 10));

comment on column public.course_status_events.kind is
  'Either ''transition'' (normal workflow step) or ''admin_override'' (admin moved the course outside the canonical transition graph). Overrides require a non-trivial note.';

commit;
