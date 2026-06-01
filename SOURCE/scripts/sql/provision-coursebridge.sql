-- Idempotent provisioning for CourseBridge dedicated database and role.
-- Required psql variables:
--   app_db_name, app_db_user, app_db_password

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_db_user') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_db_user', :'app_db_password');
  ELSE
    EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_db_user', :'app_db_password');
  END IF;
END
$$;

SELECT format('CREATE DATABASE %I OWNER %I', :'app_db_name', :'app_db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db_name')
\gexec

GRANT CONNECT, TEMPORARY ON DATABASE :app_db_name TO :app_db_user;
