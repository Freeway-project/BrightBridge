-- Chat hub Phase 1: 8 tables, no RLS (app-layer PBAC).

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('dm','course','role','group')),
  title           text,
  course_id       uuid references public.courses(id) on delete cascade,
  role_key        text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create unique index conversations_course_unique
  on public.conversations(course_id) where type = 'course';
create unique index conversations_role_unique
  on public.conversations(role_key) where type = 'role';

create table public.conversation_members (
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  joined_at         timestamptz not null default now(),
  removed_at        timestamptz,
  last_read_at      timestamptz,
  notification_pref text not null default 'all'
    check (notification_pref in ('all','mentions','none')),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx
  on public.conversation_members(user_id) where removed_at is null;

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id       uuid not null references public.profiles(id),
  parent_id       uuid references public.messages(id) on delete cascade,
  body            text not null,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  search_tsv      tsvector generated always as
                    (to_tsvector('simple', coalesce(body,''))) stored
);

create index messages_conversation_idx
  on public.messages(conversation_id, created_at desc);
create index messages_parent_idx
  on public.messages(parent_id) where parent_id is not null;
create index messages_search_idx
  on public.messages using gin (search_tsv);

create table public.message_mentions (
  message_id        uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (message_id, mentioned_user_id)
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.message_attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  storage_key text not null,
  filename    text not null,
  mime_type   text not null,
  size_bytes  bigint not null,
  created_at  timestamptz not null default now()
);

-- App-runtime grants (no RLS — authorization is in lib/chat/actions.ts)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_runtime') then
    grant select, insert, update, delete on
      public.conversations,
      public.conversation_members,
      public.messages,
      public.message_mentions,
      public.message_reactions,
      public.message_attachments
    to app_runtime;
  end if;
end $$;
