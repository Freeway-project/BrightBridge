-- Teardown for the [ZZTEST] delegation demo.
-- Runs safely any time. Removes ONLY the demo dataset.
-- Auth users still need to be removed manually in Supabase Studio.

\echo 'Tearing down [ZZTEST] delegation demo…'

begin;
delete from public.course_assignments    where course_id = 'a11c0000-0000-4000-8000-000000000003';
delete from public.course_status_events  where course_id = 'a11c0000-0000-4000-8000-000000000003';
delete from public.course_issue_comments
  where issue_id in (select id from public.course_issues where course_id = 'a11c0000-0000-4000-8000-000000000003');
delete from public.course_issues         where course_id = 'a11c0000-0000-4000-8000-000000000003';
delete from public.course_comments       where course_id = 'a11c0000-0000-4000-8000-000000000003';
delete from public.courses               where id        = 'a11c0000-0000-4000-8000-000000000003';
delete from public.org_unit_members      where org_unit_id like 'a11c0000-%';
delete from public.organizational_units  where id::text  like 'a11c0000-%';
delete from public.profiles              where email     like '%@coursebridge.test';
commit;

\echo 'Done. Remove the 3 auth users in Studio to finish cleanup.'
