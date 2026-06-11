-- Per-user notification dismissals. Notifications themselves are derived on
-- the fly from many sources (assignments, issues, comments, overrides), so
-- "hide" / "clear all" needs a side table that getNotificationsPageData()
-- filters against.

begin;

create table if not exists public.dismissed_notifications (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  notification_id text not null,
  dismissed_at    timestamptz not null default now(),
  primary key (user_id, notification_id)
);

comment on table public.dismissed_notifications is
  'Records each user''s dismissed synthetic notification ids (e.g. ''issue:<uuid>'', ''override:<uuid>''). getNotificationsPageData() filters items whose id is present here.';

create index if not exists dismissed_notifications_user_idx
  on public.dismissed_notifications (user_id, dismissed_at desc);

alter table public.dismissed_notifications enable row level security;

drop policy if exists dismissed_notifications_own_read on public.dismissed_notifications;
create policy dismissed_notifications_own_read on public.dismissed_notifications
  for select using (user_id = auth.uid());

drop policy if exists dismissed_notifications_own_insert on public.dismissed_notifications;
create policy dismissed_notifications_own_insert on public.dismissed_notifications
  for insert with check (user_id = auth.uid());

commit;
