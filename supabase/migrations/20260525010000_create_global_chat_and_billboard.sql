create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  author_name text not null,
  author_role text not null check (author_role in ('super_admin','admin_full','admin_viewer','standard_user','instructor')),
  body text not null check (char_length(trim(body)) between 1 and 500),
  edited_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists global_chat_messages_created_at_idx
  on public.global_chat_messages (created_at desc);

create index if not exists global_chat_messages_author_id_idx
  on public.global_chat_messages (author_id);

create table if not exists public.billboard_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 140),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  priority text not null default 'info' check (priority in ('info','warn','urgent')),
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billboard_posts_date_window_chk
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists billboard_posts_active_window_idx
  on public.billboard_posts (is_active, starts_at, ends_at, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_chat_messages'
  ) then
    alter publication supabase_realtime add table public.global_chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'billboard_posts'
  ) then
    alter publication supabase_realtime add table public.billboard_posts;
  end if;
end $$;
