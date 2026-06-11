-- Quarantine suspicious collision assignments before deletion so we can restore safely.

begin;

create schema if not exists maintenance;

create table if not exists maintenance.course_assignments_quarantine (
  quarantine_id bigserial primary key,
  batch_id uuid not null,
  quarantined_at timestamptz not null default now(),
  deleted_by text not null default current_user,
  delete_reason text not null,
  assignment_id uuid not null,
  course_id uuid not null,
  profile_id uuid not null,
  role text not null,
  assigned_by uuid not null,
  assigned_at timestamptz not null,
  source_row jsonb not null,
  unique (batch_id, assignment_id)
);

create index if not exists course_assignments_quarantine_batch_idx
  on maintenance.course_assignments_quarantine (batch_id);

create or replace function maintenance.restore_course_assignments_batch(target_batch_id uuid)
returns integer
language plpgsql
as $$
declare
  restored_count integer;
begin
  insert into public.course_assignments (id, course_id, profile_id, role, assigned_by, assigned_at)
  select q.assignment_id, q.course_id, q.profile_id, q.role, q.assigned_by, q.assigned_at
  from maintenance.course_assignments_quarantine q
  where q.batch_id = target_batch_id
  on conflict (id) do nothing;

  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;

with target_rows as (
  select *
  from public.course_assignments
  where id in (
    '6cf15016-cbe9-4bce-aad8-639724d09bb9',
    'f7fc413a-7627-4c12-a9ec-fc30a52b2235',
    '8d0a2cb4-412d-4844-bfe9-9b50f231e1cb',
    '4366f4fa-4d5a-45cb-bd77-cbc6257d8e61',
    '0d21d409-a8b9-46f4-966d-68533053a151',
    'c4004454-0907-4f91-938e-fd6944e8603d',
    '0f6fd21e-bff8-4e72-8997-7ded4bc43c34'
  )
), quarantined as (
  insert into maintenance.course_assignments_quarantine (
    batch_id,
    delete_reason,
    assignment_id,
    course_id,
    profile_id,
    role,
    assigned_by,
    assigned_at,
    source_row
  )
  select
    'f5ec13d0-ab9f-4956-a34f-d8796804baa4'::uuid,
    'Zero-activity collision cleanup (2026-05-06 deep audit)',
    t.id,
    t.course_id,
    t.profile_id,
    t.role,
    t.assigned_by,
    t.assigned_at,
    to_jsonb(t)
  from target_rows t
  on conflict (batch_id, assignment_id) do nothing
  returning assignment_id
)
delete from public.course_assignments ca
where ca.id in (select assignment_id from quarantined);

commit;
