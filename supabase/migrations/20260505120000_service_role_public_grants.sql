-- Restore PostgREST privileges for service_role after pg_dump/restore, clone, or manual
-- role changes. Without these, the admin client (service_role JWT) hits:
--   permission denied for table ... | code=42501
-- RLS still applies to anon/authenticated; service_role is intended to bypass RLS for
-- server-side admin usage, but it still needs SQL GRANTs on the objects.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
grant all privileges on sequences to service_role;
