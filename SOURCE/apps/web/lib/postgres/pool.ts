import "server-only";

import { Pool } from "pg";

let sharedPool: Pool | null = null;

function getDatabaseUrlOrThrow(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL is required when DB_PROVIDER=postgres.");
  }
  return value;
}

export function getPostgresPool(): Pool {
  if (sharedPool) {
    return sharedPool;
  }

  sharedPool = new Pool({
    connectionString: getDatabaseUrlOrThrow(),
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });

  return sharedPool;
}
