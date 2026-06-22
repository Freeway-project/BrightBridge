#!/usr/bin/env node
/**
 * create-admin-user.mjs
 *
 * Creates (or updates) a profile with a given role and password.
 * Mirrors the super-admin `createUserAction`: inserts a profiles row with a
 * fresh UUID, then sets the scrypt password_hash (salt_hex:hash_hex).
 *
 * Usage:
 *   EMAIL=person@example.com PASSWORD='secret' ROLE=admin_viewer \
 *     FULL_NAME='Full Name' node scripts/create-admin-user.mjs
 *
 * Targets DATABASE_URL (loaded from .env.prod by default) or TARGET_DATABASE_URL.
 */

import pg from "pg";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";

const scryptAsync = promisify(scrypt);

loadEnvFiles([".env.prod", "apps/web/.env.prod", ".env.local", "apps/web/.env.local"]);

const ALLOWED_ROLES = [
  "super_admin",
  "provost",
  "admin_full",
  "admin_viewer",
  "standard_user",
  "instructor",
];

const TARGET_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const ROLE = process.env.ROLE || "admin_viewer";
const FULL_NAME = process.env.FULL_NAME ?? "";

if (!TARGET_URL) {
  console.error("❌  Missing DATABASE_URL — set it in .env.prod or pass TARGET_DATABASE_URL=...");
  process.exit(1);
}
if (!EMAIL) { console.error("❌  Missing EMAIL env var"); process.exit(1); }
if (!PASSWORD) { console.error("❌  Missing PASSWORD env var"); process.exit(1); }
if (PASSWORD.length < 8) { console.error("❌  PASSWORD must be at least 8 characters"); process.exit(1); }
if (!ALLOWED_ROLES.includes(ROLE)) {
  console.error(`❌  Invalid ROLE "${ROLE}". Allowed: ${ALLOWED_ROLES.join(", ")}`);
  process.exit(1);
}

const normalizedEmail = EMAIL.trim().toLowerCase();

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
  console.log(`✅ Connected to ${parseDbUrl(TARGET_URL).host}\n`);

  const hash = await hashPassword(PASSWORD);

  const { rows: existing } = await pool.query(
    `SELECT id, email, role FROM profiles WHERE lower(email) = $1`,
    [normalizedEmail]
  );

  let result;
  if (existing.length > 0) {
    const user = existing[0];
    console.log(`ℹ️  Profile already exists: ${user.email} (current role: ${user.role}, id: ${user.id})`);
    console.log(`   Updating role → ${ROLE} and resetting password.`);
    const { rows } = await pool.query(
      `UPDATE profiles SET role = $1, password_hash = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, email, full_name, role`,
      [ROLE, hash, user.id]
    );
    result = rows[0];
  } else {
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO profiles (id, email, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role`,
      [id, normalizedEmail, FULL_NAME, ROLE, hash]
    );
    result = rows[0];
    console.log(`✨ Created new profile.`);
  }

  console.log(`\n✅ Done:`);
  console.log(`   id:        ${result.id}`);
  console.log(`   email:     ${result.email}`);
  console.log(`   full_name: ${result.full_name ?? "(none)"}`);
  console.log(`   role:      ${result.role}`);
  console.log(`   password:  set (scrypt)`);

  await pool.end();
}

main().catch((err) => {
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
