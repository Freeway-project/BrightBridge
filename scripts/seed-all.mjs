/**
 * seed-all.mjs
 *
 * Full DB wipe + comprehensive re-seed for Okanagan College.
 *
 * Sources:
 *   - scripts/hierarchy_analysis.json  (admin, VP, AD, chair data from CSVs)
 *   - "LMS Heirarchy lists/Educator Lookup(Educator Lookup) (1).csv"
 *
 * What it does:
 *   Phase 1 — Wipe: org_unit_members → organizational_units → all auth users
 *             (superadmin@coursebridge.dev is preserved)
 *   Phase 2 — Org units: college → 4 schools → 37 departments
 *   Phase 3 — Users: ~1,100+ auth users + profiles
 *   Phase 4 — Memberships: VP / AD / dept_head / admin rows
 *
 * Run from project root:
 *   node scripts/seed-all.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ───────────────────────────────────────────────────────────────────────

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SUPERADMIN_EMAIL = (process.env.IMPORT_ADMIN_EMAIL ?? "superadmin@coursebridge.dev").toLowerCase();
const DEFAULT_PASSWORD = "OkanaganDev2026!";

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function log(msg) { process.stdout.write(msg + "\n"); }

// ── Load hierarchy data ───────────────────────────────────────────────────────

const hierPath = join(__dirname, "hierarchy_analysis.json");
if (!existsSync(hierPath)) {
  console.error("Missing scripts/hierarchy_analysis.json — run python3 scripts/analyze_hierarchy.py first.");
  process.exit(1);
}
const hier = JSON.parse(readFileSync(hierPath, "utf8"));
const { admin_full, admin_viewer, vps, ads, chairs, schools, departments } = hier;

// ── Load Educator Lookup CSV ──────────────────────────────────────────────────

const lookupPath = join(__dirname, "..", "LMS Heirarchy lists", "Educator Lookup(Educator Lookup) (1).csv");
if (!existsSync(lookupPath)) {
  console.error("Missing Educator Lookup CSV at: " + lookupPath);
  process.exit(1);
}

const lookupLines = readFileSync(lookupPath, "utf8").split(/\r?\n/);
// columns: [0]=Course_Name, [1]=email, [2]=lastname, [3]=firstname
// Header row (index 0) is skipped

const educatorMap = new Map(); // normalized email → { fullName }

for (const line of lookupLines.slice(1)) {
  if (!line.trim()) continue;
  const parts = line.split(",");
  // Column 1 is always email (column 0 is course name which may contain commas)
  // Use findIndex to be robust against extra commas in course names
  const emailIdx = parts.findIndex(p => p.trim().includes("@"));
  if (emailIdx === -1) continue;
  const email = parts[emailIdx].trim().toLowerCase();
  if (!email.includes("@") || !email.includes(".")) continue;
  if (educatorMap.has(email)) continue;
  const lastname = parts[emailIdx + 1]?.trim() ?? "";
  const firstname = parts[emailIdx + 2]?.trim() ?? "";
  const fullName = firstname && lastname
    ? `${firstname} ${lastname}`
    : firstname || lastname || email.split("@")[0];
  educatorMap.set(email, { fullName });
}

log(`Educator Lookup: ${educatorMap.size} unique valid emails`);

// ── Build master user list ────────────────────────────────────────────────────
// Priority (last write wins — highest priority set last):
//   lookup educators < hierarchy standard_users < admin_viewer < admin_full

const masterUsers = new Map(); // email → { fullName, role }

for (const [email, { fullName }] of educatorMap) {
  masterUsers.set(email, { fullName, role: "standard_user" });
}
for (const u of [...chairs, ...ads, ...vps]) {
  masterUsers.set(u.email, { fullName: u.full_name, role: "standard_user" });
}
for (const u of admin_viewer) {
  masterUsers.set(u.email, { fullName: u.full_name, role: "admin_viewer" });
}
for (const u of admin_full) {
  masterUsers.set(u.email, { fullName: u.full_name, role: "admin_full" });
}
masterUsers.delete(SUPERADMIN_EMAIL); // preserved separately

log(`Master user list: ${masterUsers.size} users to seed`);
log(`  admin_full:    ${[...masterUsers.values()].filter(u => u.role === "admin_full").length}`);
log(`  admin_viewer:  ${[...masterUsers.values()].filter(u => u.role === "admin_viewer").length}`);
log(`  standard_user: ${[...masterUsers.values()].filter(u => u.role === "standard_user").length}`);

// ── Phase 1: Wipe ─────────────────────────────────────────────────────────────

log("\n=== Phase 1: Wipe ===");

const { error: e1 } = await sb.from("org_unit_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (e1) throw new Error("Wipe org_unit_members: " + e1.message);
log("  org_unit_members cleared");

const { error: e2 } = await sb.from("organizational_units").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (e2) throw new Error("Wipe organizational_units: " + e2.message);
log("  organizational_units cleared");

// Collect all auth user IDs to delete (excluding superadmin)
log("  Fetching auth users...");
const toDelete = [];
let page = 1;
while (true) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error("listUsers: " + error.message);
  const users = data?.users ?? [];
  for (const u of users) {
    if (u.email?.toLowerCase() !== SUPERADMIN_EMAIL) toDelete.push(u.id);
  }
  if (users.length < 1000) break;
  page++;
}

log(`  Deleting ${toDelete.length} auth users (batches of 5)...`);
const WIPE_BATCH = 5;
for (let i = 0; i < toDelete.length; i += WIPE_BATCH) {
  await Promise.all(toDelete.slice(i, i + WIPE_BATCH).map(id => sb.auth.admin.deleteUser(id)));
  if (i % 100 < WIPE_BATCH && i > 0) log(`    ... ${i}/${toDelete.length} deleted`);
}
log(`  auth users cleared (${toDelete.length} deleted, superadmin preserved)`);

// ── Phase 2: Org Units ────────────────────────────────────────────────────────

log("\n=== Phase 2: Org Units ===");

const { data: rootData, error: rootErr } = await sb
  .from("organizational_units")
  .insert({ name: "Okanagan College", type: "college" })
  .select("id")
  .single();
if (rootErr) throw new Error("Root insert: " + rootErr.message);
const rootId = rootData.id;
log(`  college: Okanagan College (${rootId})`);

const schoolIdMap = {};
for (const school of schools) {
  const { data, error } = await sb
    .from("organizational_units")
    .insert({ name: school, type: "school", parent_id: rootId })
    .select("id")
    .single();
  if (error) throw new Error(`School insert (${school}): ${error.message}`);
  schoolIdMap[school] = data.id;
  log(`  school: ${school}`);
}

const deptIdMap = {}; // "dept|school" → uuid
for (const [deptName, schoolName] of departments) {
  const parentId = schoolIdMap[schoolName];
  if (!parentId) { log(`  WARN: no school for dept "${deptName}" → "${schoolName}", skipping`); continue; }
  const key = `${deptName}|${schoolName}`;
  const { data, error } = await sb
    .from("organizational_units")
    .insert({ name: deptName, type: "department", parent_id: parentId })
    .select("id")
    .single();
  if (error) throw new Error(`Dept insert (${deptName}): ${error.message}`);
  deptIdMap[key] = data.id;
}
log(`  departments: ${Object.keys(deptIdMap).length}`);

// ── Phase 3: Auth Users + Profiles ───────────────────────────────────────────

log(`\n=== Phase 3: Users (${masterUsers.size} total) ===`);
log("  This may take several minutes...");

const profileIdMap = {}; // email → uuid
let created = 0;
let errored = 0;

for (const [email, { fullName, role }] of masterUsers) {
  try {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    const userId = data.user.id;
    const { error: pErr } = await sb.from("profiles").upsert(
      { id: userId, email, full_name: fullName, role },
      { onConflict: "id" }
    );
    if (pErr) throw new Error("Profile upsert: " + pErr.message);
    profileIdMap[email] = userId;
    created++;
    if (created % 50 === 0) log(`  ... ${created}/${masterUsers.size}`);
  } catch (err) {
    log(`  ERROR (${email}): ${err.message}`);
    errored++;
  }
}
log(`  done: ${created} created, ${errored} errors`);

// ── Phase 4: Org Unit Members ─────────────────────────────────────────────────

log("\n=== Phase 4: Org Unit Members ===");

const memberRows = [];

for (const vp of vps) {
  const profileId = profileIdMap[vp.email];
  const orgUnitId = schoolIdMap[vp.school];
  if (!profileId || !orgUnitId) { log(`  WARN: skipping VP ${vp.email}`); continue; }
  memberRows.push({ profile_id: profileId, org_unit_id: orgUnitId, title: "vp", is_primary: true });
}

for (const ad of ads) {
  const profileId = profileIdMap[ad.email];
  const orgUnitId = schoolIdMap[ad.school];
  if (!profileId || !orgUnitId) { log(`  WARN: skipping AD ${ad.email}`); continue; }
  memberRows.push({ profile_id: profileId, org_unit_id: orgUnitId, title: "associate_dean", is_primary: true });
}

for (const u of [...admin_full, ...admin_viewer]) {
  const profileId = profileIdMap[u.email];
  if (!profileId) continue;
  memberRows.push({ profile_id: profileId, org_unit_id: rootId, title: "admin", is_primary: true });
}

const addedChairDept = new Set();
for (const chair of chairs) {
  const profileId = profileIdMap[chair.email];
  if (!profileId) continue;

  for (const adEmail of chair.supervisor_ad_emails) {
    const ad = ads.find(a => a.email === adEmail);
    if (!ad) continue;
    const deptKey = `${chair.dept}|${ad.school}`;
    const orgUnitId = deptIdMap[deptKey];
    if (!orgUnitId) continue;
    const dedupeKey = `${chair.email}|${deptKey}`;
    if (addedChairDept.has(dedupeKey)) continue;
    addedChairDept.add(dedupeKey);
    memberRows.push({ profile_id: profileId, org_unit_id: orgUnitId, title: "dept_head", is_primary: true });
    break;
  }

  // Cross-school: add secondary memberships
  const chairSchools = [...new Set(
    chair.supervisor_ad_emails
      .map(e => ads.find(a => a.email === e)?.school)
      .filter(Boolean)
  )];
  for (const school of chairSchools.slice(1)) {
    const deptKey = `${chair.dept}|${school}`;
    const orgUnitId = deptIdMap[deptKey];
    if (!orgUnitId) continue;
    const dedupeKey = `${chair.email}|${deptKey}`;
    if (addedChairDept.has(dedupeKey)) continue;
    addedChairDept.add(dedupeKey);
    memberRows.push({ profile_id: profileId, org_unit_id: orgUnitId, title: "dept_head", is_primary: false });
  }
}

log(`  inserting ${memberRows.length} membership rows...`);
if (memberRows.length > 0) {
  const { error } = await sb.from("org_unit_members").insert(memberRows);
  if (error) throw new Error("org_unit_members insert: " + error.message);
}
log("  done");

// ── Summary ───────────────────────────────────────────────────────────────────

const unitCount = 1 + schools.length + Object.keys(deptIdMap).length;
log("\n=== Complete ===");
log(`  Org units:   ${unitCount} (1 college + ${schools.length} schools + ${Object.keys(deptIdMap).length} depts)`);
log(`  Profiles:    ${created} seeded + 1 superadmin preserved`);
log(`  Memberships: ${memberRows.length}`);
if (errored > 0) log(`  WARNINGS:    ${errored} users failed (see ERRORs above)`);
log("");

// ── Helpers ───────────────────────────────────────────────────────────────────

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
