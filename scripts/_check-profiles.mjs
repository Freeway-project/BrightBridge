import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local", "apps/web/.env"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("profiles")
  .select("email, full_name, role, created_at")
  .order("role")
  .order("created_at");

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

console.log(`\nTotal profiles: ${data.length}\n`);

// Group by role for readability
const byRole = {};
for (const row of data) {
  (byRole[row.role] ??= []).push(row);
}

for (const [role, rows] of Object.entries(byRole)) {
  console.log(`\n── ${role.toUpperCase()} (${rows.length}) ──`);
  for (const r of rows) {
    const ts = r.created_at?.slice(0, 16).replace("T", " ") ?? "?";
    console.log(`  ${r.email?.padEnd(45)} ${r.full_name ?? ""} [${ts}]`);
  }
}
