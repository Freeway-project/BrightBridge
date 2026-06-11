-- Delegation demo — LOCAL ONLY.
-- Creates an isolated [ZZTEST] dataset so a dean can act on behalf of an instructor.
-- Prereq: three auth users created in local Supabase Studio (http://<host>:54323):
--   dean.test@coursebridge.test
--   instructor.test@coursebridge.test
--   ta.test@coursebridge.test
-- After seeding: log in as dean.test → /instructor → demo course appears under
-- "Your department" → open → "Acting as Associate Dean on behalf of Instructor Test".

\echo 'Seeding [ZZTEST] delegation demo…'

begin;
with u as (
  select
    (select id from auth.users where email='dean.test@coursebridge.test')        as dean,
    (select id from auth.users where email='instructor.test@coursebridge.test')  as instr,
    (select id from auth.users where email='ta.test@coursebridge.test')          as ta
)
, p as (
  insert into public.profiles (id, email, full_name, role)
  select dean,  'dean.test@coursebridge.test',       'Dean Test',       'instructor'    from u
  union all
  select instr, 'instructor.test@coursebridge.test', 'Instructor Test', 'instructor'    from u
  union all
  select ta,    'ta.test@coursebridge.test',         'TA Test',         'standard_user' from u
  on conflict (id) do update set role = excluded.role, full_name = excluded.full_name
  returning 1
)
, units as (
  insert into public.organizational_units (id, parent_id, name, type) values
    ('a11c0000-0000-4000-8000-000000000001', null,                                   '[ZZTEST] Demo College',    'college'),
    ('a11c0000-0000-4000-8000-000000000002', 'a11c0000-0000-4000-8000-000000000001', '[ZZTEST] Demo Department', 'department')
  on conflict (id) do nothing
  returning 1
)
, mem as (
  insert into public.org_unit_members (profile_id, org_unit_id, title, is_primary)
  select dean, 'a11c0000-0000-4000-8000-000000000001', 'associate_dean', true from u
  returning 1
)
, crs as (
  insert into public.courses (id, source_course_id, title, term, department, org_unit_id, status, created_by)
  select 'a11c0000-0000-4000-8000-000000000003',
         'ZZTEST-DELEG',
         '[ZZTEST] Delegation Demo Course',
         'Demo Term',
         '[ZZTEST] Demo Department',
         'a11c0000-0000-4000-8000-000000000002',
         'sent_to_instructor',
         dean
  from u
  on conflict (id) do nothing
  returning 1
)
insert into public.course_assignments (course_id, profile_id, role, assigned_by)
select 'a11c0000-0000-4000-8000-000000000003', instr, 'instructor', dean from u
union all
select 'a11c0000-0000-4000-8000-000000000003', ta,    'staff',      dean from u;
commit;

\echo 'Done. Log in as dean.test to drive the demo.'
