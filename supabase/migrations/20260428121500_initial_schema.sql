-- CourseBridge initial MVP schema.
-- Based on docs/data-model.md.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in (
      'ta',
      'admin',
      'communications',
      'instructor',
      'super_admin'
    )
  )
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  source_course_id text,
  target_course_id text,
  title text not null,
  term text,
  department text,
  status text not null default 'course_created',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_status_check check (
    status in (
      'course_created',
      'assigned_to_ta',
      'ta_review_in_progress',
      'submitted_to_admin',
      'admin_changes_requested',
      'ready_for_instructor',
      'sent_to_instructor',
      'instructor_questions',
      'instructor_approved',
      'final_approved'
    )
  )
);

create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  constraint course_assignments_role_check check (
    role in (
      'ta',
      'admin',
      'communications',
      'instructor',
      'super_admin'
    )
  ),
  constraint course_assignments_unique_role unique (course_id, profile_id, role)
);

create table public.course_status_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid not null references public.profiles(id),
  actor_role text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint course_status_events_from_status_check check (
    from_status is null
    or from_status in (
      'course_created',
      'assigned_to_ta',
      'ta_review_in_progress',
      'submitted_to_admin',
      'admin_changes_requested',
      'ready_for_instructor',
      'sent_to_instructor',
      'instructor_questions',
      'instructor_approved',
      'final_approved'
    )
  ),
  constraint course_status_events_to_status_check check (
    to_status in (
      'course_created',
      'assigned_to_ta',
      'ta_review_in_progress',
      'submitted_to_admin',
      'admin_changes_requested',
      'ready_for_instructor',
      'sent_to_instructor',
      'instructor_questions',
      'instructor_approved',
      'final_approved'
    )
  ),
  constraint course_status_events_actor_role_check check (
    actor_role in (
      'ta',
      'admin',
      'communications',
      'instructor',
      'super_admin'
    )
  )
);

create table public.review_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.review_sections(id),
  responded_by uuid not null references public.profiles(id),
  response_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_responses_status_check check (
    status in ('draft', 'submitted')
  ),
  constraint review_responses_unique_section unique (course_id, section_id)
);

create trigger set_review_responses_updated_at
before update on public.review_responses
for each row
execute function public.set_updated_at();

create table public.course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  visibility text not null default 'internal',
  body text not null,
  parent_comment_id uuid references public.course_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_comments_visibility_check check (
    visibility in ('internal', 'instructor_visible')
  )
);

create trigger set_course_comments_updated_at
before update on public.course_comments
for each row
execute function public.set_updated_at();

create table public.review_invites (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles(email);
create index profiles_role_idx on public.profiles(role);

create index courses_status_idx on public.courses(status);
create index courses_created_by_idx on public.courses(created_by);

create index course_assignments_course_id_idx on public.course_assignments(course_id);
create index course_assignments_profile_id_idx on public.course_assignments(profile_id);
create index course_assignments_course_profile_idx on public.course_assignments(course_id, profile_id);

create index course_status_events_course_created_idx
on public.course_status_events(course_id, created_at);

create index review_sections_sort_order_idx on public.review_sections(sort_order);

create index review_responses_course_id_idx on public.review_responses(course_id);
create index review_responses_course_section_idx on public.review_responses(course_id, section_id);

create index course_comments_course_created_idx on public.course_comments(course_id, created_at);
create index course_comments_course_visibility_idx on public.course_comments(course_id, visibility);

create index review_invites_course_id_idx on public.review_invites(course_id);
create index review_invites_email_idx on public.review_invites(email);
create index review_invites_token_hash_idx on public.review_invites(token_hash);

insert into public.review_sections (key, title, description, sort_order)
values
  (
    'course_metadata',
    'Course Metadata',
    'Basic course identity, term, department, and migration metadata.',
    10
  ),
  (
    'review_matrix',
    'Review Matrix',
    'Structured checklist for migrated course review items.',
    20
  ),
  (
    'syllabus_review',
    'Syllabus Review',
    'Syllabus presence, accuracy, links, dates, and Brightspace readiness.',
    30
  ),
  (
    'gradebook_review',
    'Gradebook Review',
    'Gradebook categories, items, weights, visibility, and calculation checks.',
    40
  ),
  (
    'general_notes',
    'General Notes',
    'Additional reviewer notes not captured in the structured sections.',
    50
  )
on conflict (key) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_assignments enable row level security;
alter table public.course_status_events enable row level security;
alter table public.review_sections enable row level security;
alter table public.review_responses enable row level security;
alter table public.course_comments enable row level security;
alter table public.review_invites enable row level security;
