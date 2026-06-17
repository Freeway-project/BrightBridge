begin;

with college as (
  select id
  from public.organizational_units
  where name = 'Okanagan College'
    and type = 'college'
  limit 1
), ensure_hsd as (
  insert into public.organizational_units (name, type, parent_id)
  select 'Health and Social Development', 'school', college.id
  from college
  where not exists (
    select 1
    from public.organizational_units
    where name = 'Health and Social Development'
      and type = 'school'
  )
  returning id
), hsd as (
  select id from ensure_hsd
  union all
  select id
  from public.organizational_units
  where name = 'Health and Social Development'
    and type = 'school'
)
update public.organizational_units
set parent_id = (select id from hsd),
    name = case
      when id = '1e796cbe-61cb-43e4-a0da-4686f854fe35' then 'Pharmacy Technician'
      when id = 'f3b70699-b3d4-4da3-9dfe-df6a1ad9945f' then 'Practical Nursing'
      else name
    end
where id in (
  'fbda3bb7-ba8e-41db-9d3d-04fc8599920d',
  '1e796cbe-61cb-43e4-a0da-4686f854fe35',
  '9ad7042a-c39e-455c-a5d8-c588f5c57181',
  'f3b70699-b3d4-4da3-9dfe-df6a1ad9945f',
  '978c4d78-17eb-404e-9887-09fd6fd7286f',
  '4272e1a5-7311-4d90-ab8b-12d0b65a1238'
);

update public.organizational_units
set parent_id = 'da74052e-7065-433d-bf54-a6a804b43c30'
where id = 'c8eddec7-6a52-4c59-a852-b6db4f3c069e';

update public.organizational_units
set parent_id = '2adf97a5-150c-4bb3-acb4-eb0059701f06'
where id in (
  '9c12b237-3317-497e-ac76-0a7f64ed4ff4',
  'b2e56633-4ff6-4818-b8c1-22157b530faa'
);

commit;
