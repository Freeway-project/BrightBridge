create table if not exists public.community_attachments (
  id uuid primary key default gen_random_uuid(),
  chat_message_id uuid null references public.global_chat_messages(id) on delete cascade,
  billboard_post_id uuid null references public.billboard_posts(id) on delete cascade,
  bucket_name text not null,
  object_path text not null,
  original_filename text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  status text not null default 'pending' check (status in ('pending','ready','deleted')),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_attachments_target_chk check (
    (chat_message_id is not null and billboard_post_id is null)
    or
    (chat_message_id is null and billboard_post_id is not null)
  ),
  constraint community_attachments_unique_object unique (bucket_name, object_path)
);

create index if not exists community_attachments_chat_message_idx
  on public.community_attachments (chat_message_id)
  where chat_message_id is not null;

create index if not exists community_attachments_billboard_post_idx
  on public.community_attachments (billboard_post_id)
  where billboard_post_id is not null;

create index if not exists community_attachments_status_idx
  on public.community_attachments (status, created_at desc);

insert into storage.buckets (id, name, public)
values ('community-assets', 'community-assets', false)
on conflict (id) do nothing;

alter publication supabase_realtime add table public.community_attachments;
