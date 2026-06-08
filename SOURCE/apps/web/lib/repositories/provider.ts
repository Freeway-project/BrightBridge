import "server-only";

// CourseBridge runs its data layer against direct Postgres via `pg` in all
// deployment modes. The Supabase paths in lib/repositories/supabase/* remain
// only as transitional fallbacks — set DB_PROVIDER=supabase to force them.
// New code should not branch on isPostgresProvider() — it always returns true
// under the default DB_PROVIDER=postgres.
const DB_PROVIDER_POSTGRES = "postgres";

export function getDbProvider(): string {
  return (process.env.DB_PROVIDER ?? DB_PROVIDER_POSTGRES).trim().toLowerCase();
}

export function isPostgresProvider(): boolean {
  return getDbProvider() === DB_PROVIDER_POSTGRES;
}
