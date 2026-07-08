-- User-scoped login links: an admin mints a never-expiring, reusable magic link
-- that logs an EXISTING user straight into their own dashboard (no password).
--
-- Mirrors review_invites (course-scoped) but keyed on the TARGET PROFILE instead
-- of a course: review_invites.course_id is NOT NULL and resolves to a course
-- dashboard, whereas these links resolve to a *person* and route by role via
-- /dashboard, so they carry no course.
--
-- super_admin is never a valid target — enforced in the app layer at both mint
-- (generateLoginLinkAction) and redeem (/auth/login-link/[token]).

begin;

create table if not exists public.login_links (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  token_hash        text not null unique,               -- sha256(raw token); the raw token is never stored
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  revoked_at        timestamptz,                        -- null = active
  access_count      integer not null default 0,
  first_accessed_at timestamptz,
  last_accessed_at  timestamptz
);

comment on table public.login_links is
  'Admin-minted passwordless login links for existing users. Never-expiring and reusable; at most one active (revoked_at IS NULL) link per profile — minting a new one revokes prior active links. super_admin is never a valid target (app-layer enforced).';

create index if not exists login_links_profile_idx on public.login_links(profile_id);
create index if not exists login_links_token_hash_idx on public.login_links(token_hash);

-- Match review_invites: RLS on, no policies. The server-side connection role
-- bypasses RLS; the app-layer requireAnyRole check is the authorization gate,
-- and only the server actions (via the pool) ever read/write this table.
alter table public.login_links enable row level security;

commit;
