import "server-only";

// CourseBridge runs its data layer against direct Postgres via `pg`. These
// helpers remain for legacy callsites; they unconditionally report the postgres
// provider. New code should not branch on isPostgresProvider() — it always
// returns true.
const DB_PROVIDER_POSTGRES = "postgres";

export function getDbProvider(): string {
  return DB_PROVIDER_POSTGRES;
}

export function isPostgresProvider(): boolean {
  return true;
}
