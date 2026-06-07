import "server-only";

// CourseBridge can run its data layer against Supabase (managed Postgres + RLS)
// or a self-hosted Postgres reached directly via `pg`. During the
// Supabase→Postgres migration the DEFAULT intentionally stays "supabase" so that
// existing deployments which don't set DB_PROVIDER keep their current behavior.
// Set DB_PROVIDER=postgres to switch to the direct pg repositories.
const DB_PROVIDER_POSTGRES = "postgres";
const DB_PROVIDER_SUPABASE = "supabase";

export function getDbProvider(): string {
  return (process.env.DB_PROVIDER ?? DB_PROVIDER_SUPABASE).trim().toLowerCase();
}

export function isPostgresProvider(): boolean {
  return getDbProvider() === DB_PROVIDER_POSTGRES;
}
