/**
 * wipe-hierarchy.mjs
 * Deletes org_unit_members and organizational_units rows.
 * Profiles and auth users are kept intact.
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(files) {
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv([".env.local", "apps/web/.env.local"]);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: m } = await sb.from("org_unit_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (m) throw new Error("Failed to wipe org_unit_members: " + m.message);
console.log("  org_unit_members wiped");

const { error: u } = await sb.from("organizational_units").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (u) throw new Error("Failed to wipe organizational_units: " + u.message);
console.log("  organizational_units wiped");

console.log("Done.");
