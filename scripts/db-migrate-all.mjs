import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const MIGRATIONS_DIR = "db/migrations";

loadEnvFiles([
  ".env.local",
  ".env.development",
  ".env",
  "apps/web/.env.local",
  "apps/web/.env",
  ".env.mirror",
]);

const databaseUrl =
  process.env.DEV_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const baselineOnExisting = ["1", "true", "yes", "on"].includes(
  (process.env.MIGRATION_BASELINE_ON_EXISTING ?? "").trim().toLowerCase()
);

if (!databaseUrl) {
  console.error(
    [
      "Missing DEV_DATABASE_URL or DATABASE_URL.",
      "Add a Postgres connection string to .env.mirror and/or apps/web/.env.local.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const AUTH_COMPAT_FILE = "20260427000000_auth_compat.sql";
const MONITORING_FILE = "20260429000000_monitoring_setup.sql";

if (migrationFiles.length === 0) {
  console.log("No migration files found.");
  process.exit(0);
}

const connectionConfig = parseDatabaseUrl(databaseUrl);
let client = new pg.Client({
  ...connectionConfig,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  try {
    await client.connect();
  } catch (error) {
    if (!isSslUnsupportedError(error)) {
      throw error;
    }

    console.warn("Database does not support SSL. Retrying migrations without SSL.");
    client = new pg.Client(connectionConfig);
    await client.connect();
  }

  // Ensure migration tracking table exists.
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Some later migrations reference monitoring.* objects.
  await client.query("CREATE SCHEMA IF NOT EXISTS monitoring");

  if (baselineOnExisting) {
    const existsResult = await client.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') AS exists"
    );

    if (existsResult.rows[0].exists) {
      console.log("Baseline mode enabled with pre-existing schema. Recording all migrations as applied.");

      for (const file of migrationFiles) {
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
          [file]
        );
      }

      process.exit(0);
    }
  }

  // Bootstrap: if the schema already exists from a manual migration run but
  // the tracking table is empty, record all current files as applied so they
  // are not re-executed (CREATE TABLE statements are not idempotent).
  const countResult = await client.query("SELECT COUNT(*) AS count FROM schema_migrations");
  const appliedCount = Number(countResult.rows[0].count);

  if (appliedCount === 0) {
    const existsResult = await client.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') AS exists"
    );

    if (existsResult.rows[0].exists) {
      console.log("Pre-existing schema detected. Bootstrapping migration tracking...");

      for (const file of migrationFiles) {
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
          [file]
        );
      }

      // Apply compat fixups that may not have been run manually.
      await client.query(
        "ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey"
      );
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coursebridge_user') THEN
            BEGIN
              ALTER ROLE coursebridge_user BYPASSRLS;
            EXCEPTION
              WHEN insufficient_privilege THEN
                RAISE NOTICE 'Skipping BYPASSRLS grant: insufficient privilege.';
            END;
          END IF;
        END
        $$
      `);

      console.log(`Bootstrap complete: ${migrationFiles.length} migration(s) recorded.`);
    }
  }

  // Determine which migrations have already been applied.
  const appliedResult = await client.query("SELECT name FROM schema_migrations");
  const appliedMigrations = new Set(appliedResult.rows.map(r => r.name));

  // Legacy migration files reference auth roles (anon/authenticated/service_role).
  // On plain Postgres these roles do not exist; detect their absence so we can
  // rewrite references to PUBLIC before applying.
  const roleRows = await client.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')"
  );
  const roleSet = new Set(roleRows.rows.map((row) => row.rolname));
  const shouldRewriteLegacyAuthRoles =
    !roleSet.has("anon") || !roleSet.has("authenticated") || !roleSet.has("service_role");

  // Legacy migration files target a `supabase_realtime` publication that does
  // not exist on plain Postgres. When the publication is absent we strip those
  // statements so the rest of the migration file still applies — realtime is
  // replaced by polling at the app layer, so publication membership is moot.
  const pubResult = await client.query(
    "SELECT EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AS exists"
  );
  const hasRealtimePublication = pubResult.rows[0].exists;

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    if (file === MONITORING_FILE) {
      console.log(`Skipping optional monitoring migration: ${file}`);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
      continue;
    }

    // On hosted Supabase the auth schema is owned by GoTrue — postgres cannot
    // CREATE inside it even with IF NOT EXISTS. Skip the compat stub entirely;
    // the real auth.users and auth.uid() are already present.
    if (file === AUTH_COMPAT_FILE) {
      const authExists = await client.query(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users') AS exists"
      );
      if (authExists.rows[0].exists) {
        console.log(`Skipping auth_compat migration (Supabase auth schema already present): ${file}`);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
          [file]
        );
        continue;
      }
    }

    const migrationPath = path.join(MIGRATIONS_DIR, file);
    let sql = readFileSync(migrationPath, "utf8");

    if (shouldRewriteLegacyAuthRoles && file !== AUTH_COMPAT_FILE) {
      // Replace legacy auth role references with PUBLIC where those roles are absent.
      sql = sql
        .replace(/\bauthenticated\b/g, "public")
        .replace(/\bservice_role\b/g, "public")
        .replace(/\banon\b/g, "public");
    }

    if (!hasRealtimePublication) {
      // Drop CREATE/ALTER/DROP PUBLICATION statements targeting the legacy
      // realtime publication so the rest of the migration still applies on
      // plain Postgres.
      sql = sql.replace(/\b(?:create|alter|drop)\s+publication\s+supabase_realtime\b[^;]*;/gi, "");
    }

    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
      console.log(`Applied migration: ${migrationPath}`);
    } catch (error) {
      if (!isSkippableMigrationError(error)) {
        throw error;
      }

      console.warn(`Skipping migration ${file}: ${error.message ?? error}`);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file]
      );
    }
  }
} catch (error) {
  console.error("Migration batch failed.");
  console.error(error.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end();
}

function loadEnvFiles(files) {
  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");

      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }
}

function parseDatabaseUrl(value) {
  try {
    const url = new URL(value);
    // Return explicit params so pg-connection-string never touches the URL and
    // the caller's ssl:{rejectUnauthorized:false} is the only SSL config applied.
    const portIndex = url.host.lastIndexOf(":");
    const host = portIndex === -1 ? url.hostname : url.hostname;
    const port = url.port ? Number(url.port) : 5432;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname.replace(/^\//, "").split("?")[0] || "postgres";
    return { host, port, user, password, database };
  } catch {
    return parseManualDatabaseUrl(value);
  }
}

function parseManualDatabaseUrl(value) {
  const protocolMatch = value.match(/^postgres(?:ql)?:\/\//);

  if (!protocolMatch) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://.");
  }

  const withoutProtocol = value.slice(protocolMatch[0].length);
  const atIndex = withoutProtocol.lastIndexOf("@");

  if (atIndex === -1) {
    throw new Error("DATABASE_URL must include user, password, host, and database.");
  }

  const userInfo = withoutProtocol.slice(0, atIndex);
  const hostInfo = withoutProtocol.slice(atIndex + 1);
  const passwordIndex = userInfo.indexOf(":");

  if (passwordIndex === -1) {
    throw new Error("DATABASE_URL must include a database password.");
  }

  const user = userInfo.slice(0, passwordIndex);
  const password = userInfo.slice(passwordIndex + 1);
  const slashIndex = hostInfo.indexOf("/");

  if (slashIndex === -1) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  const hostAndPort = hostInfo.slice(0, slashIndex);
  const databaseAndQuery = hostInfo.slice(slashIndex + 1);
  const portIndex = hostAndPort.lastIndexOf(":");
  const host = portIndex === -1 ? hostAndPort : hostAndPort.slice(0, portIndex);
  const port = portIndex === -1 ? 5432 : Number(hostAndPort.slice(portIndex + 1));
  const database = databaseAndQuery.split("?")[0];

  return {
    user,
    password,
    host,
    port,
    database
  };
}

function isSslUnsupportedError(error) {
  const message = error?.message ?? "";
  return typeof message === "string" && message.includes("does not support SSL connections");
}

function isSkippableMigrationError(error) {
  const message = error?.message ?? "";

  return (
    typeof message === "string" &&
    message.includes('duplicate key value violates unique constraint "organizational_units_name_parent_key"')
  );
}
