-- Persistent log of instructor-facing emails (course-ready handoffs + resends).
-- WHY a dedicated table (not audit_log / not review_invites):
--   * review_invites only stores magic-link tokens — it knows nothing about
--     whether the email actually left the building, which provider handled it,
--     or whether it failed. The Emails tab needs that send-attempt history.
--   * audit_log records actor via auth.uid(); our sends happen from server
--     actions running with the service role, so the actor would be lost.
--   * We need a single "what's the most recent send for this course?" lookup
--     to gate the Resend button (resend only when last send failed).

begin;

create table if not exists public.instructor_emails (
  id                   uuid primary key default gen_random_uuid(),
  course_id            uuid not null references public.courses(id) on delete cascade,
  sent_by              uuid not null references public.profiles(id),
  recipient            text not null,
  subject              text not null,
  body_html            text not null,
  body_text            text not null,
  status               text not null check (status in ('pending','sent','failed')),
  provider             text,                       -- 'microsoft-graph' | 'resend' | 'noop'
  provider_message_id  text,
  send_error           text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

comment on table public.instructor_emails is
  'Send-attempt log for instructor-facing course handoff emails. Drives the admin "Emails" tab and the resend-only-on-failure gate.';

create index if not exists instructor_emails_course_id_idx
  on public.instructor_emails (course_id, created_at desc);

alter table public.instructor_emails enable row level security;

-- Admins (full/viewer/super) read all; nobody else has visibility into
-- send attempts. Writes happen only via the service-role server actions.
drop policy if exists instructor_emails_admin_read on public.instructor_emails;
create policy instructor_emails_admin_read on public.instructor_emails
  for select using (public.is_admin_role());

commit;
