-- Remove the auth.users FK from profiles — Azure OIDC user IDs are not
-- registered in auth.users, so the FK would reject every profile upsert.
-- Grant BYPASSRLS to the app role so RLS policies referencing auth.uid()
-- (which returns NULL on plain PostgreSQL) do not silently filter all rows.

ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coursebridge_user') THEN
    ALTER ROLE coursebridge_user BYPASSRLS;
  END IF;
END
$$;
