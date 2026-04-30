import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const MIGRATIONS_DIR = "supabase/migrations";

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local"]);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    [
      "Missing DATABASE_URL.",
      "Add your Supabase Postgres connection string to .env.local or apps/web/.env.local."
    ].join("\n")
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

if (migrationFiles.length === 0) {
  console.log("No migration files found.");
  process.exit(0);
}

const client = new pg.Client({
  ...parseDatabaseUrl(databaseUrl),
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();

  for (const file of migrationFiles) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    const sql = readFileSync(migrationPath, "utf8");
    await client.query(sql);
    console.log(`Applied migration: ${migrationPath}`);
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
    new URL(value);
    return {
      connectionString: value
    };
  } catch {
    return parseSupabaseDatabaseUrl(value);
  }
}

function parseSupabaseDatabaseUrl(value) {
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
