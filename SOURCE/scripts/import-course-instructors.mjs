/**
 * Import instructors from CSV into Supabase Auth + profiles table.
 *
 * Prerequisites:
 *   NEXT_PUBLIC_SUPABASE_URL        — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY       — service-role (admin) key
 *   DATABASE_URL                    — direct Postgres connection string
 *   INSTRUCTOR_DEFAULT_PASSWORD     — common password assigned to every account
 *
 * Usage:
 *   node scripts/import-course-instructors.mjs [path/to/file.csv]
 *
 * The script is idempotent: re-running it skips already-existing accounts and
 * still applies the role correction for any profiles created outside this run.
 */

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

const DEFAULT_CSV_PATH = "Educator Lookup(Educator Lookup).csv";
const REQUIRED_HEADERS = ["Course_Name", "email", "lastname", "firstname"];
const CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local", "apps/web/.env"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const commonPassword = process.env.INSTRUCTOR_DEFAULT_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}
if (!databaseUrl) {
  fatal("Missing DATABASE_URL in env.");
}
if (!commonPassword) {
  fatal(
    "Missing INSTRUCTOR_DEFAULT_PASSWORD.\n" +
    "Add it to .env.local:  INSTRUCTOR_DEFAULT_PASSWORD=YourPasswordHere"
  );
}
if (!existsSync(csvPath)) {
  fatal(`CSV file not found: ${csvPath}`);
}

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

const csvText = readFileSync(csvPath, "utf8");
const { headers, records } = parseCsv(csvText);

for (const h of REQUIRED_HEADERS) {
  if (!headers.includes(h)) fatal(`Missing required CSV header: ${h}`);
}

// Collect unique instructors keyed by email
const instructorMap = new Map(); // email → { email, full_name }

for (const row of records) {
  const email = normalizeEmail(row.email);
  if (!email || !isValidEmail(email)) continue;
  if (instructorMap.has(email)) continue;

  const firstName = normalizeText(row.firstname);
  const lastName = normalizeText(row.lastname);
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email;

  instructorMap.set(email, { email, full_name: fullName });
}

const instructors = [...instructorMap.values()];
console.log(`\nFound ${instructors.length} unique instructor emails in CSV.\n`);

// ---------------------------------------------------------------------------
// Step 1 — Create auth users via Supabase Admin API
// ---------------------------------------------------------------------------

const stats = { created: 0, skipped: 0, failed: 0 };
const failures = [];

for (let i = 0; i < instructors.length; i += CONCURRENCY) {
  const batch = instructors.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map((inst) => createAuthUser(inst, stats, failures)));

  const done = Math.min(i + CONCURRENCY, instructors.length);
  if (done % 100 === 0 || done === instructors.length) {
    process.stdout.write(
      `  auth users — processed ${done}/${instructors.length}  ` +
      `(created: ${stats.created}, skipped: ${stats.skipped}, failed: ${stats.failed})\r`
    );
  }
}

console.log(); // newline after progress line

// ---------------------------------------------------------------------------
// Step 2 — Bulk-set role = 'instructor' for all imported emails
// ---------------------------------------------------------------------------

const client = new pg.Client({
  ...parseDatabaseUrl(databaseUrl),
  ssl: { rejectUnauthorized: false },
  family: 4   // force IPv4 — avoids ENETUNREACH on IPv6-only Supabase pooler URLs
});

await client.connect();

let profilesUpdated = 0;

try {
  const emails = instructors.map((i) => i.email);

  for (const chunk of chunkArray(emails, 1000)) {
    const result = await client.query(
      `UPDATE public.profiles
          SET role = 'instructor'
        WHERE email = ANY($1::text[])
          AND role = 'ta'`,
      [chunk]
    );
    profilesUpdated += result.rowCount ?? 0;
  }
} finally {
  await client.end();
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n--- Import complete ---");
console.log(`  Auth users created  : ${stats.created}`);
console.log(`  Auth users skipped  : ${stats.skipped}  (already existed)`);
console.log(`  Auth users failed   : ${stats.failed}`);
console.log(`  Profiles updated    : ${profilesUpdated}  (role → instructor)`);

if (failures.length > 0) {
  console.log("\nFailed entries:");
  for (const { email, error } of failures) {
    console.log(`  ${email} — ${error}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAuthUser(instructor, stats, failures) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      email: instructor.email,
      password: commonPassword,
      email_confirm: true,
      user_metadata: { full_name: instructor.full_name }
    })
  });

  if (res.ok) {
    stats.created += 1;
    return;
  }

  const body = await res.json().catch(() => ({}));
  const code = body.error_code ?? body.code ?? res.status;

  // 422 / "email_exists" means the account already exists — that's fine
  if (
    res.status === 422 ||
    code === "email_exists" ||
    (typeof body.msg === "string" && body.msg.toLowerCase().includes("already been registered"))
  ) {
    stats.skipped += 1;
    return;
  }

  stats.failed += 1;
  failures.push({ email: instructor.email, error: body.msg ?? body.error ?? `HTTP ${res.status}` });
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], records: [] };

  const headers = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = values[j] ?? "";
    records.push(row);
  }

  return { headers, records };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') { current += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { values.push(current); current = ""; continue; }
    current += ch;
  }

  values.push(current);
  return values;
}

function normalizeText(v) { return String(v ?? "").trim(); }
function normalizeEmail(v) { return normalizeText(v).toLowerCase(); }
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function fatal(msg) { console.error(msg); process.exit(1); }

function loadEnvFiles(files) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function parseDatabaseUrl(value) {
  try { new URL(value); return { connectionString: value }; } catch {}

  const proto = value.match(/^postgres(?:ql)?:\/\//);
  if (!proto) throw new Error("DATABASE_URL must start with postgresql:// or postgres://");

  const rest = value.slice(proto[0].length);
  const atIdx = rest.lastIndexOf("@");
  if (atIdx === -1) throw new Error("DATABASE_URL missing host info");

  const userInfo = rest.slice(0, atIdx);
  const hostInfo = rest.slice(atIdx + 1);
  const colonIdx = userInfo.indexOf(":");
  if (colonIdx === -1) throw new Error("DATABASE_URL missing password");

  const user = userInfo.slice(0, colonIdx);
  const password = userInfo.slice(colonIdx + 1);
  const slashIdx = hostInfo.indexOf("/");
  if (slashIdx === -1) throw new Error("DATABASE_URL missing database name");

  const hostPort = hostInfo.slice(0, slashIdx);
  const database = hostInfo.slice(slashIdx + 1).split("?")[0];
  const portIdx = hostPort.lastIndexOf(":");
  const host = portIdx === -1 ? hostPort : hostPort.slice(0, portIdx);
  const port = portIdx === -1 ? 5432 : Number(hostPort.slice(portIdx + 1));

  return { user, password, host, port, database };
}
