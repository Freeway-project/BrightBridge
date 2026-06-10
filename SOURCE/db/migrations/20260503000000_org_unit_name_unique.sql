begin;

-- Composite unique on (name, parent_id) so the same department name can appear
-- in different schools, but not twice in the same school.
-- NULLS NOT DISTINCT (Postgres 15+) ensures the root unit (parent_id IS NULL)
-- is also protected — two rows with the same name and NULL parent are treated as duplicates.
alter table public.organizational_units
  add constraint organizational_units_name_parent_key
  unique nulls not distinct (name, parent_id);

commit;
