create table course_escalations (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(id) on delete cascade,
  created_by   uuid not null references profiles(id),
  severity     text not null check (severity in ('minor', 'major', 'critical')),
  title        text not null,
  status       text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by  uuid references profiles(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table escalation_messages (
  id             uuid primary key default gen_random_uuid(),
  escalation_id  uuid not null references course_escalations(id) on delete cascade,
  author_id      uuid not null references profiles(id),
  body           text not null,
  created_at     timestamptz not null default now()
);

create index idx_course_escalations_course_id on course_escalations(course_id);
create index idx_course_escalations_status    on course_escalations(status);
create index idx_escalation_messages_esc_id   on escalation_messages(escalation_id);
