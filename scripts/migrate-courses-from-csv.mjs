/**
 * Migrates courses from the new authoritative spreadsheet into BrightBridge.
 *
 * CSV columns supported:
 *   - Migration sheet: Brightspace, Moodle, Department, Educator, Email
 *   - TA form export : Course Code, Course Title, Course Term, Course Section(s),
 *                      Brightspace Course URL, Moodle Course URL, Reviewer, Email
 *
 * What it does:
 *   1. Loads department mapping from scripts/dept-mapping.json (auto-generates a draft if missing)
 *   2. Resolves TA profiles (CSV email or reviewer-name mapping)
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
 *   - IMPORT_ADMIN_EMAIL set to an existing admin/super_admin email
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CSV =
  "Migration_Courses_with_Educators(Migration Courses).csv";
const DEPT_MAPPING_PATH = "scripts/dept-mapping.json";
const CHUNK = 500;
const DEFAULT_IMPORT_ADMIN_EMAIL = "admin@coursebridge.dev";
const VALID_TERM_CODES = new Set(["10", "11", "20", "21", "22", "30", "31"]);
const REVIEWER_EMAIL_MAP = {
  "matthew t.": "gtindogan@okanagan.bc.ca",
  "nick u.": "nusatenco@okanagan.bc.ca",
  "nick c.": "ncornell@okanagan.bc.ca",
  "filip s.": "fshakalau@okanagan.bc.ca",
  "alfiya k.": "akhanum@okanagan.bc.ca",
  "mikhail f.": "mikhail.fokin@myokanagan.bc.ca",
  "ava r.": "aroy@okanaganbc.ca",
};

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

loadEnvFiles([".env.local", ".env", "apps/web/.env.local", "apps/web/.env"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV;
const dryRun = !process.argv.includes("--run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.IMPORT_ADMIN_EMAIL ?? DEFAULT_IMPORT_ADMIN_EMAIL;

if (!supabaseUrl || !serviceRoleKey)
  fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
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

const isMigrationSheet =
  headers.includes("Brightspace") &&
  headers.includes("Moodle") &&
  headers.includes("Department");
const isTaFormSheet =
  headers.includes("Course Code") &&
  headers.includes("Course Title") &&
  headers.includes("Brightspace Course URL") &&
  headers.includes("Moodle Course URL");

if (!isMigrationSheet && !isTaFormSheet) {
  fatal(
    "Unsupported CSV headers.\n" +
    "Expected either migration headers (Brightspace/Moodle/Department/...) or TA form headers (Course Code/Course Title/Brightspace Course URL/...)."
  );
}

// Normalise and deduplicate
const csvRows = records
  .map((r) => {
    const courseRef = resolveCourseRef(r);
    return {
    moodle: courseRef.moodle,
    brightspace: resolveBrightspaceRef(r),
    dept: String(r.Department ?? r["Department Code"] ?? "").trim(),
    term: extractTermCode(r, courseRef.moodle),
    educator: String(r.Educator ?? r.Reviewer ?? "").trim(),
    reviewer: String(r.Reviewer ?? "").trim(),
    email: String(r.Email ?? "").trim().toLowerCase(),
    taEmail: resolveTaEmail(r),
    moodleUrl: normalizeUrl(String(r["Moodle Course URL"] ?? "")),
    brightspaceUrl: normalizeUrl(String(r["Brightspace Course URL"] ?? "")),
    swappedCourseCodeTitle: courseRef.swapped,
  };
  })
  .filter((r) => r.moodle.length > 0);

const swappedRows = csvRows.filter((r) => r.swappedCourseCodeTitle).length;

const checkRows = csvRows.filter(
  (r) => r.taEmail === ""
);
const actionableRows = csvRows.filter(
  (r) => r.taEmail !== ""
);

console.log(`CSV rows total          : ${csvRows.length}`);
console.log(`  with TA mapping       : ${actionableRows.length}`);
console.log(`  missing TA mapping    : ${checkRows.length} (staff linkage skipped for these)`);
console.log(`  code/title swaps      : ${swappedRows} (weak Course Code -> Course Title)`);

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
// Step 2 — TA profile lookup
// ---------------------------------------------------------------------------

console.log("\n--- Step 2: TA profile lookup ---");

const uniqueTaEmails = [
  ...new Map(
    actionableRows
      .filter((r) => r.taEmail)
      .map((r) => [r.taEmail, { email: r.taEmail, full_name: r.reviewer || r.educator }])
  ).values(),
];

console.log(`Unique TA emails in CSV/mapping: ${uniqueTaEmails.length}`);

// Fetch existing profiles
const existingEmailSet = new Set();
const emailToProfileId = new Map();

for (const chunk of chunkArray(uniqueTaEmails.map((i) => i.email), 500)) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, role")
    .in("email", chunk);
  if (error) fatal("Failed to fetch profiles: " + error.message);
  for (const r of data) {
    if (r.role !== "standard_user") continue;
    existingEmailSet.add(r.email);
    emailToProfileId.set(r.email, r.id);
  }
}

const missingTaProfiles = uniqueTaEmails.filter((i) => !existingEmailSet.has(i.email));
console.log(`  Existing standard_user profiles : ${existingEmailSet.size}`);
console.log(`  Missing standard_user profiles  : ${missingTaProfiles.length}`);
if (missingTaProfiles.length > 0) {
  console.log(`  [INFO] ${missingTaProfiles.length} TA emails could not be linked to standard_user profiles.`);
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

const toUpdate = [];   // { id, source_course_id, target_course_id, org_unit_id, term, status? }
const toCreate = [];   // full course rows from CSV with no DB match
const assignmentsToAdd = []; // { course_id, profile_id, role, assigned_by }
let alreadyEnriched = 0;

for (const row of csvRows) {
  const key = row.moodle.toLowerCase();
  const dbCourse = titleToCourse.get(key);
  const orgUnitId = deptMapping[normDept(row.dept)] ?? null;

  if (dbCourse) {
    // Matched — check if already enriched
    const nextStatus = shouldSetSubmittedToAdmin(dbCourse.status, row.taEmail) ? "submitted_to_admin" : null;
    const needsUpdate =
      dbCourse.source_course_id !== row.moodle ||
      dbCourse.target_course_id !== row.brightspace ||
      dbCourse.org_unit_id !== orgUnitId ||
      (row.term !== null && dbCourse.term !== row.term) ||
      (nextStatus !== null && dbCourse.status !== nextStatus);

    if (needsUpdate) {
      toUpdate.push({
        id: dbCourse.id,
        source_course_id: row.moodle,
        target_course_id: row.brightspace,
        org_unit_id: orgUnitId,
        term: row.term,
        status: nextStatus,
      });
    } else {
      alreadyEnriched++;
    }

    // Link staff/TA if profile exists
    if (row.taEmail && emailToProfileId.has(row.taEmail)) {
      assignmentsToAdd.push({
        course_id: dbCourse.id,
        profile_id: emailToProfileId.get(row.taEmail),
        role: "staff",
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
      term: row.term,
      status: row.taEmail ? "submitted_to_admin" : "course_created",
      created_by: adminId,
      _taEmail: row.taEmail, // used post-insert for assignments, stripped before INSERT
    });
  }
}

console.log(`  Already fully enriched : ${alreadyEnriched}`);
console.log(`  To update (enrich)     : ${toUpdate.length}`);
console.log(`  To create (new)        : ${toCreate.length}`);
console.log(`  Staff assignments      : ${assignmentsToAdd.length}`);

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
console.log(`Staff assignments to add      : ${assignmentsToAdd.length}`);
console.log(`Orphan active courses         : ${orphanUpdates.length} (source_course_id + org_unit only)`);
console.log(`Rows skipped (no TA mapping)  : ${checkRows.length}`);

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
        ...(row.term ? { term: row.term } : {}),
        ...(row.status ? { status: row.status } : {}),
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

const createRows = toCreate.map(({ _taEmail, ...r }) => r);
for (const chunk of chunkArray(createRows, CHUNK)) {
  const { data, error } = await sb.from("courses").insert(chunk).select("id, title");
  if (error) fatal("Course insert failed: " + error.message);
  for (const r of data) newTitleToId.set(r.title.toLowerCase(), r.id);
  created += data.length;
  process.stdout.write(`  creating courses — ${created}/${toCreate.length}\r`);
}
console.log(`\nCourses created: ${created}`);

// Add staff assignments for new courses
for (const row of toCreate) {
  const courseId = newTitleToId.get(row.title.toLowerCase());
  if (!courseId || !row._taEmail) continue;
  const profileId = emailToProfileId.get(row._taEmail);
  if (!profileId) continue;
  assignmentsToAdd.push({
    course_id: courseId,
    profile_id: profileId,
    role: "staff",
    assigned_by: adminId,
  });
}

// Insert all staff assignments (idempotent)
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
console.log(`  Staff assignments             : ${assignmentsAdded}`);
console.log(`  Rows skipped (no TA mapping)  : ${checkRows.length}`);
console.log(`\nReview responses/comments were untouched; course status may be set to submitted_to_admin for TA-completed rows.`);

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

function resolveTaEmail(rawRow) {
  const direct = String(rawRow.Email ?? "").trim().toLowerCase();
  if (direct && direct !== "check") return direct;

  const reviewer = String(rawRow.Reviewer ?? rawRow.Educator ?? "").trim().toLowerCase();
  if (!reviewer || reviewer === "check") return "";
  return REVIEWER_EMAIL_MAP[reviewer] ?? "";
}

function shouldSetSubmittedToAdmin(currentStatus, taEmail) {
  if (!taEmail) return false;
  return currentStatus === "course_created" ||
    currentStatus === "assigned_to_ta" ||
    currentStatus === "ta_review_in_progress";
}

function normalizeUrl(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "na" || lower === "n/a" || lower === "null" || lower === "none" || lower === "blank" || lower === "-") {
    return "";
  }
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return "";
}

function isWeakCourseCode(code) {
  const value = String(code ?? "").trim();
  if (!value) return true;
  if (/^n\/?a$/i.test(value)) return true;
  return /^\d{1,5}$/.test(value);
}

function looksLikeCourseRef(value) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  // Typical imported references contain section/course tokens and often a 6-digit term suffix.
  return /[A-Za-z].*\d/.test(v) || /\d{6}/.test(v);
}

function resolveCourseRef(rawRow) {
  const moodle = String(rawRow.Moodle ?? "").trim();
  const courseCode = String(rawRow["Course Code"] ?? "").trim();
  const courseTitle = String(rawRow["Course Title"] ?? "").trim();

  if (moodle) return { moodle, swapped: false };
  if (isWeakCourseCode(courseCode) && looksLikeCourseRef(courseTitle)) {
    return { moodle: courseTitle, swapped: true };
  }
  return { moodle: courseCode || courseTitle, swapped: false };
}

function resolveBrightspaceRef(rawRow) {
  const raw = String(rawRow.Brightspace ?? "").trim();
  if (raw) return raw;
  const url = normalizeUrl(String(rawRow["Brightspace Course URL"] ?? ""));
  if (!url) return "";
  const m = url.match(/\/home\/(\d+)/i);
  return m ? m[1] : url;
}

function extractTermCode(rawRow, normalizedCourseRef = "") {
  const rawCourseTerm = String(rawRow["Course Term"] ?? "").trim();
  if (/^\d{6}$/.test(rawCourseTerm)) {
    const season = rawCourseTerm.slice(4, 6);
    return VALID_TERM_CODES.has(season) ? rawCourseTerm : null;
  }

  const fromMoodle = String(normalizedCourseRef ?? "").match(/(?:^|[._-])(\d{6})(?:$|[._-])/);
  if (!fromMoodle) return null;

  const code = fromMoodle[1];
  const season = code.slice(4, 6);
  return VALID_TERM_CODES.has(season) ? code : null;
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
