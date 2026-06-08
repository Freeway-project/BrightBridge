-- Compatibility stub for the Supabase auth schema on vanilla PostgreSQL.
-- Lets Supabase-style migrations (auth.users FK, auth.uid(), role grants) parse
-- and execute when no Supabase/GoTrue instance is present (self-hosted Postgres).
--
-- Safe to run against a live Supabase too: every object is created only if it
-- does not already exist. In particular auth.uid() is created with a guarded
-- CREATE FUNCTION (not CREATE OR REPLACE) so it NEVER overwrites Supabase's real
-- auth.uid() — overwriting it would make every RLS predicate evaluate against
-- NULL and silently hide all rows.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

-- Install a NULL-returning auth.uid() ONLY when one does not already exist.
DO $$
BEGIN
  CREATE FUNCTION auth.uid()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  AS $fn$ SELECT NULL::uuid $fn$;
EXCEPTION
  WHEN duplicate_function THEN NULL;     -- real Supabase auth.uid() already present
  WHEN insufficient_privilege THEN NULL;
END
$$;

-- Supabase roles referenced by GRANT statements across migrations.
DO $$
BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$$;
