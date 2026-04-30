begin;

-- 1. Organizational Units (The Tree)
create table public.organizational_units (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references public.organizational_units(id) on delete set null,
    name text not null,
    type text not null, -- 'university', 'college', 'faculty', 'department', 'unit'
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for tree traversal
create index organizational_units_parent_id_idx on public.organizational_units(parent_id);

-- 2. Org Unit Members (The Positions)
create table public.org_unit_members (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade,
    org_unit_id uuid references public.organizational_units(id) on delete cascade,
    title text not null, -- 'dean', 'assistant_dean', 'dept_head', 'educator', 'staff'
    is_primary boolean default true,
    created_at timestamptz default now(),
    unique(profile_id, org_unit_id)
);

create index org_unit_members_profile_id_idx on public.org_unit_members(profile_id);
create index org_unit_members_org_unit_id_idx on public.org_unit_members(org_unit_id);

-- 3. Update Courses
alter table public.courses add column org_unit_id uuid references public.organizational_units(id) on delete set null;
create index courses_org_unit_id_idx on public.courses(org_unit_id);

-- 4. Recursive Hierarchy View (Flattened)
-- This allows us to find all descendants of a unit (for Deans)
-- or all ancestors (to check if a specific user oversees a specific unit)
create or replace view public.org_unit_hierarchy_paths as
with recursive unit_path as (
    -- Base case: Every unit is its own descendant at depth 0
    select id as ancestor_id, id as descendant_id, 0 as depth
    from public.organizational_units
    union all
    -- Recursive step: Find all children of current descendants
    select p.ancestor_id, u.id, p.depth + 1
    from unit_path p
    join public.organizational_units u on u.parent_id = p.descendant_id
)
select * from unit_path;

-- 5. Trigger for updated_at
create trigger set_organizational_units_updated_at
    before update on public.organizational_units
    for each row
    execute function public.handle_updated_at();

commit;
