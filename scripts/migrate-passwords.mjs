#!/usr/bin/env node
/**
 * migrate-passwords.mjs
 *
 * Copies bcrypt password hashes from old Supabase auth.users
 * into the new Supabase profiles.password_hash column.
 *
 * Usage:
 *   node scripts/migrate-passwords.mjs
 *
 * Reads SOURCE from PROD_DATABASE_URL (.env.mirror)
 * Reads TARGET from DATABASE_URL (.env.prod)
 */

import pg from "pg";
import { existsSync, readFileSync } from "node:fs";

loadEnvFiles([".env.mirror", ".env.prod", "apps/web/.env.prod"]);

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || process.env.PROD_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!SOURCE_URL) { console.error("❌  Missing PROD_DATABASE_URL in .env.mirror"); process.exit(1); }
if (!TARGET_URL) { console.error("❌  Missing DATABASE_URL in .env.prod"); process.exit(1); }

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

const src = new pg.Pool({ ...parseDbUrl(SOURCE_URL), max: 2 });
const tgt = new pg.Pool({ ...parseDbUrl(TARGET_URL), max: 2 });

async function main() {
  console.log("Connecting...");
  await src.query("SELECT 1");
  console.log("  ✅ Source (old Supabase)");
  await tgt.query("SELECT 1");
  console.log("  ✅ Target (new Supabase)\n");

  // Pull id + bcrypt hash from old auth.users
  const { rows: authUsers } = await src.query(`
    SELECT id::text, encrypted_password
    FROM auth.users
    WHERE encrypted_password IS NOT NULL
  `);
  console.log(`Found ${authUsers.length} users with passwords in old auth.users\n`);

  let updated = 0;
  let skipped = 0;

  for (const { id, encrypted_password } of authUsers) {
    const result = await tgt.query(
      `UPDATE profiles SET password_hash = $1 WHERE id = $2 AND (password_hash IS NULL OR password_hash != $1)`,
      [encrypted_password, id]
    );
    if (result.rowCount > 0) updated++;
    else skipped++;
  }

  console.log(`✅ Done — ${updated} passwords migrated, ${skipped} already set/skipped`);

  await src.end();
  await tgt.end();
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});

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
