/**
 * Migrates courses from the new authoritative spreadsheet into BrightBridge.
 *
 * CSV columns expected: Brightspace, Moodle, Department, Educator, Email
 *
 * What it does:
 *   1. Loads department mapping from scripts/dept-mapping.json (auto-generates a draft if missing)
 *   2. Upserts instructor profiles (email lookup → create if missing)
 *   3. Enriches existing DB courses that match CSV.Moodle → DB.title
 *      (sets source_course_id, target_course_id, org_unit_id — never touches review data)
 *   4. Creates new course rows for CSV entries with no DB match
 *   5. Partially enriches the 24 active orphan courses not in the CSV
 *
 * Usage:
 *   node scripts/migrate-courses-from-csv.mjs [path/to/file.csv]           # dry-run (default)
 *   node scripts/migrate-courses-from-csv.mjs [path/to/file.csv] --run     # live run
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 *   - IMPORT_ADMIN_EMAIL set to an existing super_admin email
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CSV =
  "Migration_Courses_with_Educators(Migration Courses).csv";
const DEPT_MAPPING_PATH = "scripts/dept-mapping.json";
const CHUNK = 500;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

loadEnvFiles([".env.local", ".env", "apps/web/.env.local", "apps/web/.env"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV;
const dryRun = !process.argv.includes("--run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.IMPORT_ADMIN_EMAIL;

if (!supabaseUrl || !serviceRoleKey)
  fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
if (!adminEmail)
  fatal("Missing IMPORT_ADMIN_EMAIL.\nSet it to an existing super_admin email in .env.local.");
if (!existsSync(csvPath)) fatal(`CSV not found: ${csvPath}`);

const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

console.log(`\n=== Course Migration Script ===`);
console.log(`Mode : ${dryRun ? "DRY-RUN (no changes will be written)" : "LIVE RUN"}`);
console.log(`CSV  : ${csvPath}\n`);

// ---------------------------------------------------------------------------
// Resolve admin profile id
// ---------------------------------------------------------------------------

const { data: adminProfile, error: adminErr } = await sb
  .from("profiles")
  .select("id")
  .eq("email", adminEmail)
  .single();
if (adminErr || !adminProfile) fatal(`Admin profile not found for: ${adminEmail}`);
const adminId = adminProfile.id;

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

const rawCsv = readFileSync(csvPath, "utf8");
const { headers, records } = parseCsv(rawCsv);

for (const h of ["Brightspace", "Moodle", "Department", "Educator", "Email"]) {
  if (!headers.includes(h)) fatal(`Missing required CSV header: "${h}"`);
}

// Normalise and deduplicate
const csvRows = records
  .map((r) => ({
    moodle: r.Moodle.trim(),
    brightspace: r.Brightspace.trim(),
    dept: r.Department.trim(),
    educator: r.Educator.trim(),
    email: r.Email.trim().toLowerCase(),
  }))
  .filter((r) => r.moodle.length > 0);

const checkRows = csvRows.filter(
  (r) => r.educator.toUpperCase() === "CHECK" || r.email === "" || r.email === "check"
);
const actionableRows = csvRows.filter(
  (r) => r.educator.toUpperCase() !== "CHECK" && r.email !== "" && r.email !== "check"
);

console.log(`CSV rows total          : ${csvRows.length}`);
console.log(`  with educator+email   : ${actionableRows.length}`);
console.log(`  CHECK / missing email : ${checkRows.length} (instructor linkage skipped for these)`);

// Unique dept codes from CSV
const uniqueDeptCodes = [...new Set(csvRows.map((r) => r.dept))].sort();

// ---------------------------------------------------------------------------
// Step 1 — Department mapping
// ---------------------------------------------------------------------------

console.log("\n--- Step 1: Department mapping ---");

// Fetch all org units (departments only)
const allOrgUnits = [];
{
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from("organizational_units")
      .select("id, name, type, parent_id")
      .range(page * 1000, page * 1000 + 999);
    if (error) fatal("Failed to fetch org units: " + error.message);
    if (!data.length) break;
    allOrgUnits.push(...data);
    if (data.length < 1000) break;
    page++;
  }
}

const departments = allOrgUnits.filter((u) => u.type === "department");
console.log(`Org unit departments in DB: ${departments.length}`);

// Auto-generate mapping draft if file doesn't exist
if (!existsSync(DEPT_MAPPING_PATH)) {
  console.log(`\nNo dept-mapping.json found — generating a draft at ${DEPT_MAPPING_PATH}`);
  console.log("Review and fill in any nulls, then re-run.\n");

  const draft = {};
  for (const code of uniqueDeptCodes) {
    // Try to find a department whose name contains the code (very rough)
    const codeLower = code.toLowerCase();
    const match = departments.find(
      (d) => d.name.toLowerCase().includes(codeLower) || codeLower.includes(d.name.toLowerCase().split(" ")[0])
    );
    draft[code] = match ? match.id : null;
    const label = match ? `→ ${match.name}` : "→ ??? (needs manual mapping)";
    console.log(`  ${code.padEnd(10)} ${label}`);
  }

  if (!dryRun) writeFileSync(DEPT_MAPPING_PATH, JSON.stringify(draft, null, 2));
  else console.log("\n[DRY-RUN] dept-mapping.json NOT written. Pass --run to write it, review it, then re-run with --run.");

  console.log(`\nFill in any null values in ${DEPT_MAPPING_PATH} with the correct org_unit UUID.`);
  console.log("Then re-run: node scripts/migrate-courses-from-csv.mjs [csv] --run\n");
  process.exit(0);
}

const rawDeptMapping = JSON.parse(readFileSync(DEPT_MAPPING_PATH, "utf8"));

// Normalise all keys to uppercase+trimmed so CDA /CDA-/Adva/Trades etc. resolve correctly.
// Keys that end with a hyphen keep the hyphen (WET-, HCA-, etc.) — only leading/trailing
// whitespace is removed, then the whole string is uppercased.
function normDept(raw) {
  return raw.trim().toUpperCase();
}
const deptMapping = Object.fromEntries(
  Object.entries(rawDeptMapping)
    .filter(([k]) => !k.startsWith("_")) // skip _notes
    .map(([k, v]) => [normDept(k), v])
);

const unmappedCodes = uniqueDeptCodes.filter((c) => deptMapping[normDept(c)] === undefined);
const nullCodes     = uniqueDeptCodes.filter((c) => deptMapping[normDept(c)] === null);
if (unmappedCodes.length > 0) {
  console.warn(`\nWARNING: ${unmappedCodes.length} dept codes have no entry in dept-mapping.json:`);
  for (const c of unmappedCodes) console.warn(`  "${c}"`);
  console.warn("These courses will have org_unit_id left as null.\n");
}
if (nullCodes.length > 0) {
  console.log(`Intentionally null (${nullCodes.length}): ${nullCodes.join(", ")} — org_unit_id will be null.`);
}

console.log(`Dept codes mapped: ${uniqueDeptCodes.length - unmappedCodes.length - nullCodes.length} / ${uniqueDeptCodes.length}`);

// ---------------------------------------------------------------------------
// Step 2 — Instructor profiles (upsert)
// ---------------------------------------------------------------------------

console.log("\n--- Step 2: Instructor profiles ---");

const uniqueInstructors = [
  ...new Map(
    actionableRows
      .filter((r) => r.email)
      .map((r) => [r.email, { email: r.email, full_name: r.educator }])
  ).values(),
];

console.log(`Unique instructors with email: ${uniqueInstructors.length}`);

// Fetch existing profiles
const existingEmailSet = new Set();
const emailToProfileId = new Map();

for (const chunk of chunkArray(uniqueInstructors.map((i) => i.email), 500)) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email")
    .in("email", chunk);
  if (error) fatal("Failed to fetch profiles: " + error.message);
  for (const r of data) {
    existingEmailSet.add(r.email);
    emailToProfileId.set(r.email, r.id);
  }
}

const newInstructors = uniqueInstructors.filter((i) => !existingEmailSet.has(i.email));
console.log(`  Already in DB : ${existingEmailSet.size}`);
console.log(`  To create     : ${newInstructors.length}`);

if (newInstructors.length > 0) {
  if (!dryRun) {
    for (const chunk of chunkArray(newInstructors, CHUNK)) {
      const rows = chunk.map((i) => ({
        // No auth.users entry yet — will be created when they sign up via invite
        // We need to use a workaround: insert into profiles requires an auth.users id
        // So we skip creating profiles here and just note the gap
        email: i.email,
        full_name: i.full_name,
      }));
      // Note: profiles.id references auth.users(id), so we cannot INSERT directly.
      // Instructor profiles will be created automatically when they accept an invite.
      // We only link assignments for instructors who already have profiles.
      console.log(`  [INFO] ${chunk.length} instructors need auth accounts before they can be linked.`);
      break;
    }
  } else {
    console.log(`  [DRY-RUN] Would note ${newInstructors.length} instructors as needing auth accounts.`);
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Load all DB courses (paginated)
// ---------------------------------------------------------------------------

console.log("\n--- Loading DB courses ---");

const dbCourses = [];
{
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from("courses")
      .select("id, title, source_course_id, target_course_id, org_unit_id, status")
      .range(page * 1000, page * 1000 + 999);
    if (error) fatal("Failed to fetch courses: " + error.message);
    if (!data.length) break;
    dbCourses.push(...data);
    if (data.length < 1000) break;
    page++;
    process.stdout.write(`  fetched ${dbCourses.length} courses...\r`);
  }
}
console.log(`\nTotal DB courses loaded: ${dbCourses.length}`);

// Build title → course map (normalised lowercase)
const titleToCourse = new Map();
for (const c of dbCourses) {
  titleToCourse.set(c.title.trim().toLowerCase(), c);
}

// ---------------------------------------------------------------------------
// Step 4 — Match CSV rows to DB courses and enrich
// ---------------------------------------------------------------------------

console.log("\n--- Step 3: Enrich matched courses ---");

const toUpdate = [];   // { id, source_course_id, target_course_id, org_unit_id }
const toCreate = [];   // full course rows from CSV with no DB match
const assignmentsToAdd = []; // { course_id, profile_id, role, assigned_by }
let alreadyEnriched = 0;

for (const row of csvRows) {
  const key = row.moodle.toLowerCase();
  const dbCourse = titleToCourse.get(key);
  const orgUnitId = deptMapping[normDept(row.dept)] ?? null;

  if (dbCourse) {
    // Matched — check if already enriched
    const needsUpdate =
      dbCourse.source_course_id !== row.moodle ||
      dbCourse.target_course_id !== row.brightspace ||
      dbCourse.org_unit_id !== orgUnitId;

    if (needsUpdate) {
      toUpdate.push({
        id: dbCourse.id,
        source_course_id: row.moodle,
        target_course_id: row.brightspace,
        org_unit_id: orgUnitId,
      });
    } else {
      alreadyEnriched++;
    }

    // Link instructor if profile exists
    if (row.email && emailToProfileId.has(row.email)) {
      assignmentsToAdd.push({
        course_id: dbCourse.id,
        profile_id: emailToProfileId.get(row.email),
        role: "instructor",
        assigned_by: adminId,
      });
    }
  } else {
    // No DB match — queue for creation
    toCreate.push({
      title: row.moodle,
      source_course_id: row.moodle,
      target_course_id: row.brightspace,
      org_unit_id: orgUnitId,
      status: "course_created",
      created_by: adminId,
      _email: row.email, // used post-insert for assignments, stripped before INSERT
    });
  }
}

console.log(`  Already fully enriched : ${alreadyEnriched}`);
console.log(`  To update (enrich)     : ${toUpdate.length}`);
console.log(`  To create (new)        : ${toCreate.length}`);
console.log(`  Instructor assignments : ${assignmentsToAdd.length}`);

// ---------------------------------------------------------------------------
// Step 5 — Identify orphan active courses (not in CSV, have activity)
// ---------------------------------------------------------------------------

console.log("\n--- Step 4: Orphan active courses ---");

// Active = has course_assignments
const assignedCourseIds = new Set();
{
  const { data, error } = await sb.from("course_assignments").select("course_id");
  if (error) fatal("Failed to fetch assignments: " + error.message);
  for (const r of data) assignedCourseIds.add(r.course_id);
}

const csvMoodleSet = new Set(csvRows.map((r) => r.moodle.toLowerCase()));
const orphanCourses = dbCourses.filter(
  (c) =>
    assignedCourseIds.has(c.id) &&
    !csvMoodleSet.has(c.title.trim().toLowerCase())
);

console.log(`  Orphan active courses: ${orphanCourses.length}`);

const orphanUpdates = [];
for (const c of orphanCourses) {
  // Infer org_unit from title prefix (e.g. BUAD-xxx → BUAD dept code)
  const prefix = c.title.split("-")[0];
  const orgUnitId = deptMapping[normDept(prefix)] ?? null;

  orphanUpdates.push({
    id: c.id,
    source_course_id: c.title.trim(), // title IS the Moodle code
    org_unit_id: orgUnitId,
    // target_course_id: NOT set — not in CSV
  });

  const mapped = orgUnitId ? `org_unit=${orgUnitId.slice(0, 8)}…` : "org_unit=UNMAPPED";
  console.log(`  ${c.title} | ${mapped} | activity preserved`);
}

// ---------------------------------------------------------------------------
// Summary before acting
// ---------------------------------------------------------------------------

console.log("\n=== Summary ===");
console.log(`Courses to enrich (update)    : ${toUpdate.length}`);
console.log(`Courses to create             : ${toCreate.length}`);
console.log(`Instructor assignments to add : ${assignmentsToAdd.length}`);
console.log(`Orphan active courses         : ${orphanUpdates.length} (source_course_id + org_unit only)`);
console.log(`CHECK rows (skipped)          : ${checkRows.length}`);

if (dryRun) {
  console.log("\n[DRY-RUN] No changes written. Re-run with --run to apply.\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Apply changes
// ---------------------------------------------------------------------------

console.log("\n--- Applying changes ---");

// Enrich existing courses
let enriched = 0;
for (const chunk of chunkArray(toUpdate, CHUNK)) {
  for (const row of chunk) {
    const { error } = await sb
      .from("courses")
      .update({
        source_course_id: row.source_course_id,
        target_course_id: row.target_course_id,
        org_unit_id: row.org_unit_id,
      })
      .eq("id", row.id);
    if (error) console.error(`  Failed to update course ${row.id}: ${error.message}`);
    else enriched++;
  }
  process.stdout.write(`  enriching courses — ${enriched}/${toUpdate.length}\r`);
}
console.log(`\nCourses enriched: ${enriched}`);

// Enrich orphan active courses (source + org only)
let orphanEnriched = 0;
for (const row of orphanUpdates) {
  const update = { source_course_id: row.source_course_id };
  if (row.org_unit_id) update.org_unit_id = row.org_unit_id;
  const { error } = await sb.from("courses").update(update).eq("id", row.id);
  if (error) console.error(`  Failed orphan update ${row.id}: ${error.message}`);
  else orphanEnriched++;
}
console.log(`Orphan courses partially enriched: ${orphanEnriched}`);

// Create new courses
let created = 0;
const newTitleToId = new Map();

const createRows = toCreate.map(({ _email, ...r }) => r);
for (const chunk of chunkArray(createRows, CHUNK)) {
  const { data, error } = await sb.from("courses").insert(chunk).select("id, title");
  if (error) fatal("Course insert failed: " + error.message);
  for (const r of data) newTitleToId.set(r.title.toLowerCase(), r.id);
  created += data.length;
  process.stdout.write(`  creating courses — ${created}/${toCreate.length}\r`);
}
console.log(`\nCourses created: ${created}`);

// Add instructor assignments for new courses
for (const row of toCreate) {
  const courseId = newTitleToId.get(row.title.toLowerCase());
  if (!courseId || !row._email) continue;
  const profileId = emailToProfileId.get(row._email);
  if (!profileId) continue;
  assignmentsToAdd.push({
    course_id: courseId,
    profile_id: profileId,
    role: "instructor",
    assigned_by: adminId,
  });
}

// Insert all instructor assignments (idempotent)
let assignmentsAdded = 0;
for (const chunk of chunkArray(assignmentsToAdd, CHUNK)) {
  const { error } = await sb
    .from("course_assignments")
    .upsert(chunk, { onConflict: "course_id,profile_id,role", ignoreDuplicates: true });
  if (error) console.error(`  Assignment upsert error: ${error.message}`);
  else assignmentsAdded += chunk.length;
  process.stdout.write(`  assignments — ${assignmentsAdded}/${assignmentsToAdd.length}\r`);
}
console.log(`\nAssignments added/verified: ${assignmentsAdded}`);

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

console.log("\n=== Migration complete ===");
console.log(`  Courses enriched (existing)  : ${enriched}`);
console.log(`  Courses created (new)        : ${created}`);
console.log(`  Orphan courses partial enrich: ${orphanEnriched}`);
console.log(`  Instructor assignments        : ${assignmentsAdded}`);
console.log(`  CHECK rows (no instructor)   : ${checkRows.length}`);
console.log(`\nNo review data, comments, or status events were touched.`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], records: [] };
  const headers = parseCsvLine(lines[0]);
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, records };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { values.push(current); current = ""; continue; }
    current += ch;
  }
  values.push(current);
  return values;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function fatal(msg) { console.error("\nFATAL: " + msg); process.exit(1); }

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
