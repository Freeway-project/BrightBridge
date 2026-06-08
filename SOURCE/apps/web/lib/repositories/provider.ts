import "server-only";

const DB_PROVIDER_POSTGRES = "postgres";

export function getDbProvider(): string {
  return (process.env.DB_PROVIDER ?? DB_PROVIDER_POSTGRES).trim().toLowerCase();
}

export function isPostgresProvider(): boolean {
  return getDbProvider() === DB_PROVIDER_POSTGRES;
}
