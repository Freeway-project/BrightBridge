#!/usr/bin/env node
/**
 * set-password.mjs
 *
 * Sets (or resets) the password for a user in the new Supabase DB.
 *
 * Usage:
 *   EMAIL=you@example.com PASSWORD=yourpassword node scripts/set-password.mjs
 *
 * Or to reset ALL users to a temp password (useful for initial migration):
 *   BULK=true PASSWORD=TempPass123! node scripts/set-password.mjs
 */

import pg from "pg";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";

const scryptAsync = promisify(scrypt);

loadEnvFiles([".env.prod", "apps/web/.env.prod", ".env.local", "apps/web/.env.local"]);

const TARGET_URL =
  process.env.TARGET_DATABASE_URL ||
  process.env.DATABASE_URL;

const EMAIL    = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const BULK     = ["1", "true", "yes"].includes((process.env.BULK ?? "").toLowerCase());

if (!TARGET_URL) {
  console.error("❌  Missing DATABASE_URL — set it in .env.prod or pass TARGET_DATABASE_URL=...");
  process.exit(1);
}
if (!PASSWORD) {
  console.error("❌  Missing PASSWORD env var");
  process.exit(1);
}
if (!BULK && !EMAIL) {
  console.error("❌  Set EMAIL=you@example.com or BULK=true");
  process.exit(1);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

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

const pool = new pg.Pool({ ...parseDbUrl(TARGET_URL), max: 2 });

async function main() {
  await pool.query("SELECT 1");
  console.log("✅ Connected to database\n");

  const hash = await hashPassword(PASSWORD);

  if (BULK) {
    const { rowCount } = await pool.query(
      `UPDATE profiles SET password_hash = $1`, [hash]
    );
    console.log(`✅ Set password for ALL ${rowCount} users`);
    console.log(`   Temp password: ${PASSWORD}`);
    console.log(`   ⚠️  Ask users to change their password after first login.`);
  } else {
    const { rows } = await pool.query(
      `SELECT id, email, global_role FROM profiles WHERE email = $1`, [EMAIL.toLowerCase()]
    );
    if (rows.length === 0) {
      console.error(`❌  No profile found for email: ${EMAIL}`);
      process.exit(1);
    }
    const user = rows[0];
    await pool.query(
      `UPDATE profiles SET password_hash = $1 WHERE id = $2`, [hash, user.id]
    );
    console.log(`✅ Password set for: ${user.email} (${user.global_role})`);
  }

  await pool.end();
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
