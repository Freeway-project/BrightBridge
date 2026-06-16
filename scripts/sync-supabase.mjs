#!/usr/bin/env node
/**
 * sync-supabase.mjs
 *
 * Copies all public-schema data from an old Supabase project to a new one.
 * Schema must already exist on the target (run db-migrate-all.mjs first).
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://..." \
 *   TARGET_DATABASE_URL="postgresql://..." \
 *   node scripts/sync-supabase.mjs
 *
 * Defaults (auto-loaded from env files):
 *   SOURCE → PROD_DATABASE_URL  (.env.mirror)
 *   TARGET → DATABASE_URL       (.env.prod)
 *
 * Options (env vars):
 *   DRY_RUN=true          — print what would be copied, no writes
 *   TABLES=courses,users  — only sync these tables (comma-separated)
 *   TRUNCATE=true         — truncate target tables before inserting (replaces ON CONFLICT DO NOTHING)
 */

import pg from "pg";
import { existsSync, readFileSync } from "node:fs";

// ── env loading ───────────────────────────────────────────────────────────────

loadEnvFiles([
  ".env.mirror",
  ".env.prod",
  "apps/web/.env.prod",
  ".env.local",
  "apps/web/.env.local",
]);

const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL || process.env.PROD_DATABASE_URL;
const TARGET_URL =
  process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const DRY_RUN = ["1", "true", "yes"].includes(
  (process.env.DRY_RUN ?? "").toLowerCase()
);
const ONLY_TABLES = process.env.TABLES
  ? process.env.TABLES.split(",").map((t) => t.trim())
  : null;
const TRUNCATE = ["1", "true", "yes"].includes(
  (process.env.TRUNCATE ?? "").toLowerCase()
);

// Rows per INSERT batch — keep params well under PG's 65535 limit
const BATCH_ROWS = 100;

// ── validation ────────────────────────────────────────────────────────────────

if (!SOURCE_URL) {
  console.error(
    "❌  Missing SOURCE_DATABASE_URL or PROD_DATABASE_URL.\n" +
      "    Set it in .env.mirror or pass it directly."
  );
  process.exit(1);
}
if (!TARGET_URL) {
  console.error(
    "❌  Missing TARGET_DATABASE_URL or DATABASE_URL.\n" +
      "    Set it in .env.prod or pass it directly."
  );
  process.exit(1);
}

if (SOURCE_URL === TARGET_URL) {
  console.error("❌  SOURCE and TARGET point to the same database. Aborting.");
  process.exit(1);
}

// ── pools ─────────────────────────────────────────────────────────────────────

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0] || "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

const srcPool = new pg.Pool({ ...parseDbUrl(SOURCE_URL), max: 3 });
const tgtPool = new pg.Pool({ ...parseDbUrl(TARGET_URL), max: 3 });

// ── helpers ───────────────────────────────────────────────────────────────────

async function getTablesInOrder(pool) {
  const { rows: allTables } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tableNames = allTables.map((r) => r.table_name);

  const { rows: fkDeps } = await pool.query(`
    SELECT
      tc.table_name  AS child,
      ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name
      AND ccu.constraint_schema = rc.unique_constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema  = 'public'
      AND ccu.table_schema = 'public'
      AND tc.table_name   != ccu.table_name
  `);

  const graph = new Map(tableNames.map((t) => [t, new Set()]));
  for (const { child, parent } of fkDeps) {
    if (graph.has(child) && graph.has(parent)) {
      graph.get(child).add(parent);
    }
  }

  const ordered = [];
  const visited = new Set();
  const stack = new Set();

  function visit(node) {
    if (visited.has(node)) return;
    if (stack.has(node)) return; // circular — skip
    stack.add(node);
    for (const dep of graph.get(node) ?? []) visit(dep);
    stack.delete(node);
    visited.add(node);
    ordered.push(node);
  }

  for (const t of tableNames) visit(t);
  return ordered;
}

async function getColumns(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

async function countRows(pool, table) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS n FROM "${table}"`
  );
  return parseInt(rows[0].n, 10);
}

async function copyTable(table, srcPool, tgtClient) {
  const cols = await getColumns(srcPool, table);
  if (cols.length === 0) return { copied: 0, skipped: 0 };

  const total = await countRows(srcPool, table);
  if (total === 0) return { copied: 0, skipped: 0 };

  if (TRUNCATE) {
    await tgtClient.query(`TRUNCATE "${table}" CASCADE`);
  }

  const quotedCols = cols.map((c) => `"${c}"`).join(", ");
  let offset = 0;
  let copied = 0;

  while (offset < total) {
    const { rows } = await srcPool.query(
      `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`,
      [BATCH_ROWS, offset]
    );
    if (rows.length === 0) break;

    const placeholders = rows
      .map(
        (_, i) =>
          `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(", ")})`
      )
      .join(", ");

    const values = rows.flatMap((row) => cols.map((c) => row[c] ?? null));

    const conflict = TRUNCATE ? "" : "ON CONFLICT DO NOTHING";
    await tgtClient.query(
      `INSERT INTO "${table}" (${quotedCols}) VALUES ${placeholders} ${conflict}`,
      values
    );

    copied += rows.length;
    offset += rows.length;
    process.stdout.write(`\r   ${table}: ${copied}/${total} rows`);
  }

  return { copied, skipped: total - copied };
}

async function resetSequences(pool) {
  const { rows } = await pool.query(`
    SELECT
      t.relname  AS table_name,
      a.attname  AS col,
      s.relname  AS seq_name
    FROM pg_class s
    JOIN pg_namespace n  ON n.oid = s.relnamespace
    JOIN pg_depend d     ON d.objid = s.oid
    JOIN pg_class t      ON t.oid  = d.refobjid
    JOIN pg_attribute a  ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
      AND n.nspname = 'public'
  `);

  for (const { table_name, col, seq_name } of rows) {
    await pool.query(`
      SELECT setval(
        '"${seq_name}"',
        COALESCE((SELECT MAX("${col}") FROM "${table_name}"), 1),
        true
      )
    `);
  }

  return rows.length;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no data will be written\n" : "");

  console.log("Connecting to databases...");
  await srcPool.query("SELECT 1");
  console.log("  ✅ Source OK");
  await tgtPool.query("SELECT 1");
  console.log("  ✅ Target OK\n");

  // Make sure target has a schema
  const { rows: tgtCheck } = await tgtPool.query(`
    SELECT COUNT(*) AS n
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  if (parseInt(tgtCheck[0].n, 10) === 0) {
    console.error(
      "❌  Target DB has no tables.\n" +
        "    Run migrations first:\n" +
        "    DATABASE_URL=<target-url> node scripts/db-migrate-all.mjs"
    );
    process.exit(1);
  }

  console.log("Resolving table dependency order...");
  let tables = await getTablesInOrder(srcPool);

  if (ONLY_TABLES) {
    tables = tables.filter((t) => ONLY_TABLES.includes(t));
    console.log(`  Filtering to: ${tables.join(", ")}`);
  }

  console.log(`  ${tables.length} tables to sync\n`);

  if (DRY_RUN) {
    console.log("Tables (in insert order):");
    for (const t of tables) {
      const n = await countRows(srcPool, t);
      console.log(`  ${t.padEnd(40)} ${n} rows`);
    }
    await srcPool.end();
    await tgtPool.end();
    return;
  }

  const tgtClient = await tgtPool.connect();
  let totalCopied = 0;
  let errors = [];

  try {
    // Disable FK triggers so we can insert in bulk without ordering worries
    // (falls back to ordered insert if this permission isn't granted)
    try {
      await tgtClient.query("SET session_replication_role = replica");
    } catch {
      // Not a superuser — rely on topological order instead
    }

    console.log("Syncing tables:");
    for (const table of tables) {
      process.stdout.write(`   ${table}... `);
      try {
        const { copied } = await copyTable(table, srcPool, tgtClient);
        process.stdout.write(`\r   ${table.padEnd(40)} ${copied} rows\n`);
        totalCopied += copied;
      } catch (err) {
        process.stdout.write(`\r   ${table.padEnd(40)} ⚠️  ${err.message}\n`);
        errors.push({ table, error: err.message });
      }
    }

    try {
      await tgtClient.query("SET session_replication_role = DEFAULT");
    } catch {
      // ignore
    }
  } finally {
    tgtClient.release();
  }

  console.log("\nResetting sequences...");
  const seqCount = await resetSequences(tgtPool);
  console.log(`  ${seqCount} sequences reset`);

  console.log(`\n✅ Done — ${totalCopied} rows copied across ${tables.length} tables`);

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} table(s) had errors:`);
    for (const { table, error } of errors) {
      console.log(`   ${table}: ${error}`);
    }
  }

  await srcPool.end();
  await tgtPool.end();
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

// ── env file loader ───────────────────────────────────────────────────────────

function loadEnvFiles(files) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
