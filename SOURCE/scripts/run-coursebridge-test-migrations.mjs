import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const MIGRATIONS = [
  {
    file: "20260603000000_create_support_messages.sql",
    table: "support_messages",
  },
  {
    file: "20260605000100_course_reassignment.sql",
    table: "course_reassignments",
  },
];

loadEnvFiles([
  ".env.local",
  ".env.development",
  ".env",
  "apps/web/.env.local",
  "apps/web/.env",
  ".env.mirror",
]);

const databaseUrl = process.env.DEV_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error(
    [
      "Missing DEV_DATABASE_URL or DATABASE_URL.",
      "Add a Postgres connection string to .env.mirror and/or apps/web/.env.local.",
    ].join("\n"),
  );
  process.exit(1);
}

const client = await connectWithFallback(databaseUrl);

try {
  const roleRows = await client.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')",
  );
  const roleSet = new Set(roleRows.rows.map((row) => row.rolname));
  const shouldRewriteLegacyAuthRoles =
    !roleSet.has("anon") || !roleSet.has("authenticated") || !roleSet.has("service_role");

  const publicationRows = await client.query(
    "SELECT EXISTS(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AS exists",
  );
  const hasRealtimePublication = publicationRows.rows[0]?.exists === true;

  for (const migration of MIGRATIONS) {
    const existsResult = await client.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
      [migration.table],
    );

    if (existsResult.rows[0]?.exists) {
      console.log(`Skipping existing migration target: public.${migration.table}`);
      continue;
    }

    const migrationPath = path.join("db/migrations", migration.file);

    if (!existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    console.log(`Applying migration: ${migrationPath}`);
    let sql = readFileSync(migrationPath, "utf8");

    if (shouldRewriteLegacyAuthRoles) {
      sql = sql
        .replace(/\bauthenticated\b/g, "public")
        .replace(/\bservice_role\b/g, "public")
        .replace(/\banon\b/g, "public");
    }

    if (!hasRealtimePublication) {
      sql = sql.replace(/\b(?:create|alter|drop)\s+publication\s+supabase_realtime\b[^;]*;/gi, "");
    }

    await client.query(sql);
  }
} catch (error) {
  console.error("CourseBridge test migrations failed.");
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

async function connectWithFallback(url) {
  const sslClient = new pg.Client({
    ...parseDatabaseUrl(url),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await sslClient.connect();
    return sslClient;
  } catch (error) {
    if (!isSslUnsupportedError(error)) {
      throw error;
    }

    console.warn("Database does not support SSL. Retrying without SSL.");
    const plainClient = new pg.Client(parseDatabaseUrl(url));
    await plainClient.connect();
    return plainClient;
  }
}

function parseDatabaseUrl(value) {
  try {
    new URL(value);
    return {
      connectionString: value,
    };
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
    database,
  };
}

function isSslUnsupportedError(error) {
  const message = String(error?.message ?? error);
  return (
    message.includes("SSL")
    && (
      message.includes("not supported")
      || message.includes("does not support")
      || message.includes("no pg_hba.conf entry")
    )
  );
}
