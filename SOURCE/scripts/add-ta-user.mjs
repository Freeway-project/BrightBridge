/**
 * Create a single TA user in Supabase Auth + set role = 'ta' in profiles.
 *
 * Prerequisites (any of these env files):
 *   NEXT_PUBLIC_SUPABASE_URL      — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — service-role (admin) key
 *   DATABASE_URL                  — direct Postgres connection string
 *
 * Usage:
 *   node scripts/add-ta-user.mjs <email> <password> [Full Name]
 *
 * Examples:
 *   node scripts/add-ta-user.mjs ta@example.com Secret123
 *   node scripts/add-ta-user.mjs ta@example.com Secret123 "Jane Smith"
 */

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local", "apps/web/.env"]);

const [email, password, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim() || null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error("Usage: node scripts/add-ta-user.mjs <email> <password> [Full Name]");
  process.exit(1);
}
if (!supabaseUrl || !serviceRoleKey) fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
if (!isValidEmail(email)) fatal(`Invalid email: ${email}`);

console.log(`\nCreating TA account for: ${email}${fullName ? ` (${fullName})` : ""}\n`);

// ---------------------------------------------------------------------------
// Step 1 — Create auth user
// ---------------------------------------------------------------------------

const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  const alreadyExists =
    res.status === 422 ||
    body.error_code === "email_exists" ||
    (typeof body.msg === "string" && body.msg.toLowerCase().includes("already been registered"));

  if (alreadyExists) {
    console.log("  Auth user already exists — skipping creation.");
  } else {
    fatal(`  Auth API error: ${body.msg ?? body.error ?? `HTTP ${res.status}`}`);
  }
} else {
  const userId = body.id;
  console.log(`  Auth user created: ${userId}`);
}

// ---------------------------------------------------------------------------
// Step 2 — Set role = 'ta' in profiles via Supabase REST API
// ---------------------------------------------------------------------------

// Wait for the DB trigger to create the profile row
await new Promise((r) => setTimeout(r, 1500));

const adminHeaders = {
  "Content-Type": "application/json",
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  Prefer: "return=representation",
};

const patch = await fetch(
  `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`,
  {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      role: "standard_user",
      ...(fullName ? { full_name: fullName } : {}),
    }),
  }
);

if (!patch.ok) {
  const err = await patch.json().catch(() => ({}));
  console.warn(`  Warning: profile update failed — ${err.message ?? `HTTP ${patch.status}`}`);
  console.warn(`  You can manually run:`);
  console.warn(`    UPDATE public.profiles SET role = 'standard_user' WHERE email = '${email.toLowerCase()}';`);
} else {
  const rows = await patch.json();
  if (!rows || rows.length === 0) {
    console.warn("  Warning: profile row not found. Trigger may still be running — wait a few seconds and re-run.");
  } else {
    const row = rows[0];
    console.log(`  Profile updated: id=${row.id}, role=${row.role}, name=${row.full_name ?? "(none)"}`);
  }
}

console.log("\nDone.");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
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
