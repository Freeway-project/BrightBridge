-- Add 'educator' to org_unit_members title constraint
-- Also sync with actual UI titles (dean, assistant_dean, etc.)

begin;

alter table public.org_unit_members
  drop constraint if exists org_unit_members_title_check;

alter table public.org_unit_members
  add constraint org_unit_members_title_check
  check (title in (
    'vp', 
    'dean', 
    'associate_dean', 
    'assistant_dean', 
    'dept_head', 
    'educator', 
    'admin', 
    'staff'
  ));

commit;
