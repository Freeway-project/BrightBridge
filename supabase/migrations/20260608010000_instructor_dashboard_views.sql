-- Per-(course, instructor) dashboard-open log. Independent of workflow status:
-- we want a "did they look at it?" dot even after the course has moved past
-- instructor_viewing (instructor_questions / instructor_approved keep the dot
-- green). Two entry points record a view: the magic-link invite redemption
-- and the instructor course page itself (covers bookmarks / direct visits).
--
-- WHY a separate table (not course_status_events):
--   * status events fire ONCE on first open (sent_to_instructor -> instructor_viewing);
--     subsequent visits are intentionally no-ops, so we'd lose last_opened_at /
--     open_count if we keyed off them.
--   * decouples the dot from the workflow state machine — visits don't move state.

begin;

create table if not exists public.instructor_dashboard_views (
  course_id        uuid not null references public.courses(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  first_opened_at  timestamptz not null default now(),
  last_opened_at   timestamptz not null default now(),
  open_count       integer not null default 1,
  primary key (course_id, profile_id)
);

comment on table public.instructor_dashboard_views is
  'Records each time an instructor opens a course dashboard. Drives the small opened/not-opened indicator in admin/comms views; independent of course workflow status.';

create index if not exists instructor_dashboard_views_course_idx
  on public.instructor_dashboard_views (course_id);

alter table public.instructor_dashboard_views enable row level security;

-- Admins (full/viewer/super) read all rows — they need the indicator in admin and
-- comms surfaces. Writes happen via service-role server code only.
drop policy if exists instructor_dashboard_views_admin_read on public.instructor_dashboard_views;
create policy instructor_dashboard_views_admin_read on public.instructor_dashboard_views
  for select using (public.is_admin_role());

-- Instructors can see their own rows (lets the instructor surface read
-- last_opened_at if we ever want to render it there).
drop policy if exists instructor_dashboard_views_self_read on public.instructor_dashboard_views;
create policy instructor_dashboard_views_self_read on public.instructor_dashboard_views
  for select using (profile_id = auth.uid());

commit;
