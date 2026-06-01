/**
 * Reads the Educator Lookup CSV and:
 *   1. Inserts missing courses (by title) into public.courses
 *   2. Inserts missing course_assignments (instructor role) for each course↔instructor pair
 *
 * Idempotent — safe to re-run. Existing courses and assignments are skipped.
 * Uses Supabase JS client (avoids direct pg IPv6 issues).
 *
 * Usage:
 *   node scripts/import-courses-and-assignments.mjs [path/to/file.csv]
 */

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CSV_PATH = "Educator Lookup(Educator Lookup).csv";
const CHUNK = 500;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local", "apps/web/.env"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.IMPORT_ADMIN_EMAIL;

if (!supabaseUrl || !serviceRoleKey) fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
if (!adminEmail) fatal("Missing IMPORT_ADMIN_EMAIL.\nSet it to an existing super_admin email in .env.local.");
if (!existsSync(csvPath)) fatal(`CSV file not found: ${csvPath}`);

const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

const { headers, records } = parseCsv(readFileSync(csvPath, "utf8"));
for (const h of ["Course_Name", "email"]) {
  if (!headers.includes(h)) fatal(`Missing required CSV header: ${h}`);
}

const uniqueTitles = new Set();
const seenPairs = new Set();
const uniquePairs = [];

for (const row of records) {
  const title = normalizeText(row.Course_Name);
  const email = normalizeEmail(row.email);
  if (!title || !email) continue;
  uniqueTitles.add(title);
  const key = `${title.toLowerCase()}||${email}`;
  if (!seenPairs.has(key)) {
    seenPairs.add(key);
    uniquePairs.push({ title_norm: title.toLowerCase(), title_orig: title, email });
  }
}

console.log(`\nCSV summary:`);
console.log(`  Unique course titles : ${uniqueTitles.size}`);
console.log(`  Unique pairs         : ${uniquePairs.length}\n`);

// ---------------------------------------------------------------------------
// Look up admin profile
// ---------------------------------------------------------------------------

const { data: adminRow, error: adminErr } = await sb
  .from("profiles")
  .select("id")
  .eq("email", adminEmail)
  .single();

if (adminErr || !adminRow) fatal(`No profile found for IMPORT_ADMIN_EMAIL="${adminEmail}".`);
const adminId = adminRow.id;
console.log(`Admin profile: ${adminId}\n`);

// ---------------------------------------------------------------------------
// Step 1 — Insert missing courses
// ---------------------------------------------------------------------------

// Fetch existing titles in pages (courses table could be large)
let existingTitleSet = new Set();
{
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from("courses")
      .select("title")
      .range(page * 1000, page * 1000 + 999);
    if (error) fatal("Failed to fetch existing courses: " + error.message);
    if (!data.length) break;
    for (const r of data) existingTitleSet.add(r.title.toLowerCase().trim());
    if (data.length < 1000) break;
    page++;
  }
}

const titlesToInsert = [...uniqueTitles].filter(t => !existingTitleSet.has(t.toLowerCase()));

console.log(`Courses already in DB : ${existingTitleSet.size}`);
console.log(`Courses to insert     : ${titlesToInsert.length}`);

let coursesInserted = 0;

for (const chunk of chunkArray(titlesToInsert, CHUNK)) {
  const rows = chunk.map(title => ({ title, status: "course_created", created_by: adminId }));
  const { data, error } = await sb.from("courses").insert(rows).select("id, title");
  if (error) fatal("Course insert failed: " + error.message);
  coursesInserted += data.length;
  process.stdout.write(`  inserting courses — ${coursesInserted}/${titlesToInsert.length}\r`);
}
console.log();
console.log(`Courses inserted      : ${coursesInserted}\n`);

// ---------------------------------------------------------------------------
// Build title → id map (fetch all courses)
// ---------------------------------------------------------------------------

const titleToId = new Map();
{
  let page = 0;
  while (true) {
    const { data, error } = await sb
      .from("courses")
      .select("id, title")
      .range(page * 1000, page * 1000 + 999);
    if (error) fatal("Failed to fetch course ids: " + error.message);
    if (!data.length) break;
    for (const r of data) titleToId.set(r.title.toLowerCase().trim(), r.id);
    if (data.length < 1000) break;
    page++;
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Insert missing course_assignments
// ---------------------------------------------------------------------------

// Fetch all instructor profiles in chunks
const allEmails = [...new Set(uniquePairs.map(p => p.email))];
const emailToProfileId = new Map();

for (const chunk of chunkArray(allEmails, 500)) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email")
    .in("email", chunk);
  if (error) fatal("Failed to fetch profiles: " + error.message);
  for (const r of data) emailToProfileId.set(r.email, r.id);
}

console.log(`Instructor profiles found in DB : ${emailToProfileId.size} / ${allEmails.length}`);

// Build valid assignment rows
const assignmentRows = [];
let skippedMissing = 0;

for (const p of uniquePairs) {
  const courseId = titleToId.get(p.title_norm);
  const profileId = emailToProfileId.get(p.email);
  if (!courseId || !profileId) { skippedMissing++; continue; }
  assignmentRows.push({ course_id: courseId, profile_id: profileId, role: "instructor", assigned_by: adminId });
}

if (skippedMissing > 0) console.log(`Pairs skipped (missing course or profile) : ${skippedMissing}`);

let assignmentsInserted = 0;

for (const chunk of chunkArray(assignmentRows, CHUNK)) {
  const { error } = await sb
    .from("course_assignments")
    .upsert(chunk, { onConflict: "course_id,profile_id,role", ignoreDuplicates: true });
  if (error) fatal("Assignment insert failed: " + error.message);
  assignmentsInserted += chunk.length;
  process.stdout.write(`  assignments — ${assignmentsInserted}/${assignmentRows.length}\r`);
}
console.log();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n--- Import complete ---");
console.log(`  Courses inserted     : ${coursesInserted}`);
console.log(`  Assignments inserted : ${assignmentRows.length - skippedMissing}`);
console.log(`  Assignments skipped  : ${skippedMissing}  (profile not found in DB)`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.length > 0);
  if (!lines.length) return { headers: [], records: [] };
  const headers = parseCsvLine(lines[0]);
  const records = lines.slice(1).map(line => {
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

function normalizeText(v) { return String(v ?? "").trim(); }
function normalizeEmail(v) { return normalizeText(v).toLowerCase(); }
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
