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

function instrumentPool(pool: Pool): void {
  // Lazy-required so this module can be imported from instrumentation.ts
  // without pulling prom-client into the edge runtime graph.

  const {
    pgQueryDurationSeconds,
    pgQueryErrorsTotal,
  } = require("@/lib/observability/metrics") as typeof import("@/lib/observability/metrics");

  const origQuery = pool.query.bind(pool);
  pool.query = ((...args: unknown[]) => {
    const end = pgQueryDurationSeconds.startTimer({ op: "query" });
    try {
      const result = (origQuery as (...a: unknown[]) => unknown)(...args);
      if (result && typeof (result as { then?: unknown }).then === "function") {
        return (result as Promise<unknown>)
          .then((r) => {
            end();
            return r;
          })
          .catch((e: unknown) => {
            end();
            pgQueryErrorsTotal.inc();
            throw e;
          });
      }
      end();
      return result;
    } catch (e) {
      end();
      pgQueryErrorsTotal.inc();
      throw e;
    }
  }) as typeof pool.query;

  const origConnect = pool.connect.bind(pool);
  pool.connect = ((...args: unknown[]) => {
    const end = pgQueryDurationSeconds.startTimer({ op: "connect" });
    try {
      const result = (origConnect as (...a: unknown[]) => unknown)(...args);
      if (result && typeof (result as { then?: unknown }).then === "function") {
        return (result as Promise<unknown>)
          .then((r) => {
            end();
            return r;
          })
          .catch((e: unknown) => {
            end();
            pgQueryErrorsTotal.inc();
            throw e;
          });
      }
      end();
      return result;
    } catch (e) {
      end();
      pgQueryErrorsTotal.inc();
      throw e;
    }
  }) as typeof pool.connect;
}

export function getPostgresPool(): Pool {
  if (sharedPool) {
    return sharedPool;
  }

  sharedPool = new Pool({
    connectionString: getDatabaseUrlOrThrow(),
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });

  try {
    instrumentPool(sharedPool);
  } catch {
    // If metrics module fails to load (e.g. in a stripped runtime), keep the
    // pool functional without observability rather than crashing the app.
  }

  return sharedPool;
}
