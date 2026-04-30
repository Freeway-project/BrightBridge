import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

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

const client = new pg.Client({
  ...parseDatabaseUrl(databaseUrl),
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();

  const roles = await client.query(`
    select role, count(*)::int as count
    from public.profiles
    group by role
    order by role
  `);

  const constraints = await client.query(`
    select conname, pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conname in (
      'profiles_role_check',
      'course_assignments_role_check',
      'course_status_events_actor_role_check'
    )
    order by conname
  `);

  const objects = await client.query(`
    select
      to_regclass('public.organizational_units') as organizational_units,
      to_regclass('public.org_unit_members') as org_unit_members,
      to_regclass('public.org_unit_hierarchy_paths') as org_unit_hierarchy_paths,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'courses'
          and column_name = 'org_unit_id'
      ) as courses_has_org_unit_id
  `);

  console.log(
    JSON.stringify(
      {
        roles: roles.rows,
        constraints: constraints.rows,
        objects: objects.rows[0]
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("DB inspection failed.");
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
