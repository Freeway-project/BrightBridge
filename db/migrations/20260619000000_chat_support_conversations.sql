-- Chat: "Support" conversation type.
-- A support conversation is a per-user channel shared by all admins
-- (super_admin + admin_full). One per requesting user, find-or-created on demand
-- by lib/chat/membership.getOrCreateSupportConversation. Authorization stays in
-- the app layer (no RLS), consistent with the rest of the chat hub.

alter table public.conversations
  drop constraint if exists conversations_type_check;

alter table public.conversations
  add constraint conversations_type_check
  check (type in ('dm','course','role','group','support'));

-- Exactly one support conversation per requesting user (the convo's created_by).
create unique index if not exists conversations_support_unique
  on public.conversations(created_by) where type = 'support';
