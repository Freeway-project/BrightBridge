#!/usr/bin/env node
/**
 * Import legacy TA course review responses into BrightBridge.
 *
 * Default mode: dry-run (no writes)
 * Live mode:    --run
 *
 * Usage:
 *   node scripts/import-ta-review-form.mjs "/path/to/Responses-Table 1.csv"
 *   node scripts/import-ta-review-form.mjs "/path/to/Responses-Table 1.csv" --run
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMPORT_ADMIN_EMAIL   (existing admin/super_admin email in profiles)
 */

import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CSV = "Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv";
const REQUIRED_HEADERS = [
  "Course Code",
  "Course Title",
  "Course Term",
  "Course Section(s)",
  "Brightspace Course URL",
  "Moodle Course URL",
  "Reviewer",
];

const argv = process.argv.slice(2);
const shouldRun = argv.includes("--run");
const csvPath = argv.find((x) => !x.startsWith("--")) ?? DEFAULT_CSV;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const importAdminEmail = process.env.IMPORT_ADMIN_EMAIL?.trim().toLowerCase();

if (!supabaseUrl || !serviceRoleKey) {
  fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
if (!importAdminEmail) {
  fatal("Missing IMPORT_ADMIN_EMAIL.");
}
if (!existsSync(csvPath)) {
  fatal(`CSV not found: ${csvPath}`);
}

const rl = readline.createInterface({ input, output });
const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

try {
  const { headers, records } = parseCsv(readFileSync(csvPath, "utf8"));
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      fatal(`Missing required CSV header: "${h}"`);
    }
  }

  const adminProfileId = await getAdminProfileId(importAdminEmail);
  const normalizedRows = normalizeRows(records);

  const reviewerNames = [...new Set(normalizedRows.map((r) => r.reviewer).filter(Boolean))].sort();
  const courseGroups = groupBy(normalizedRows, (r) => r.courseCode);
  const duplicateCourseCodes = [...courseGroups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([code, rows]) => ({ code, count: rows.length }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  console.log("\n=== TA Review Import Prep ===");
  console.log(`CSV: ${csvPath}`);
  console.log(`Rows: ${normalizedRows.length}`);
  console.log(`Distinct reviewers: ${reviewerNames.length}`);
  console.log(`Distinct course codes: ${courseGroups.size}`);
  console.log(`Duplicate course codes: ${duplicateCourseCodes.length}`);
  if (duplicateCourseCodes.length > 0) {
    console.log("Top duplicates:");
    for (const d of duplicateCourseCodes.slice(0, 10)) {
      console.log(`  - ${d.code}: ${d.count}`);
    }
  }

  const dedupeChoice = await askDedupeChoice();
  const reviewerMap = await askReviewerMappings(reviewerNames);
  const sectionId = await getReviewMatrixSectionId();

  const importRows = buildImportRows({
    rows: normalizedRows,
    reviewerMap,
    dedupeChoice,
  });

  const unresolvedReviewers = [...new Set(importRows.filter((r) => !r.reviewerProfileId).map((r) => r.reviewer))];
  if (unresolvedReviewers.length > 0) {
    console.log("\nReviewers without profile match (rows will be skipped):");
    for (const name of unresolvedReviewers) {
      console.log(`  - ${name}`);
    }
  }

  const plan = await computePlan(importRows);
  printPlan(plan);

  if (!shouldRun) {
    console.log("\nDry-run only. Re-run with --run to perform writes.");
    return;
  }

  const proceed = await rl.question("\nProceed with live import? Type YES to continue: ");
  if (proceed.trim() !== "YES") {
    console.log("Aborted.");
    return;
  }

  await executeImport({
    importRows,
    adminProfileId,
    sectionId,
    dedupeChoice,
  });

  console.log("\nImport complete.");
} catch (error) {
  console.error("\nImport failed.");
  console.error(error);
  process.exitCode = 1;
} finally {
  rl.close();
}

async function askDedupeChoice() {
  const answer = await rl.question(
    "\nDuplicate course codes found. Use which row per course?\n" +
      "  1) latest Completion time (recommended)\n" +
      "  2) earliest Completion time\n" +
      "Choose 1 or 2: ",
  );
  return answer.trim() === "2" ? "earliest" : "latest";
}

async function askReviewerMappings(reviewerNames) {
  console.log("\nReviewer mapping:");
  console.log("Provide an email for each reviewer (blank = skip reviewer).");

  const map = new Map();
  for (const name of reviewerNames) {
    const email = (await rl.question(`  ${name} -> email: `)).trim().toLowerCase();
    if (!email) {
      map.set(name, null);
      continue;
    }

    const profile = await findProfileByEmail(email);
    if (!profile) {
      console.log(`    ! No profile for "${email}". This reviewer will be skipped.`);
      map.set(name, null);
      continue;
    }
    map.set(name, profile.id);
  }
  return map;
}

function normalizeRows(records) {
  return records.map((r, idx) => {
    const row = { ...r };
    const completionRaw = cleanText(row["Completion time"]);
    const completionSerial = Number(completionRaw);
    return {
      csvRow: idx + 2,
      courseCode: cleanText(row["Course Code"]),
      courseTitle: cleanText(row["Course Title"]),
      courseTerm: cleanText(row["Course Term"]),
      courseSection: cleanText(row["Course Section(s)"]),
      brightspaceUrl: cleanText(row["Brightspace Course URL"]),
      moodleUrl: cleanText(row["Moodle Course URL"]),
      reviewer: cleanText(row["Reviewer"]),
      completionSerial: Number.isFinite(completionSerial) ? completionSerial : null,
      responseData: buildResponseData(row),
    };
  });
}

function buildResponseData(row) {
  const entries = Object.entries(row)
    .map(([k, v]) => [cleanText(k), cleanText(v)])
    .filter(([k]) => k.length > 0)
    .filter(([, v]) => v.length > 0);
  return Object.fromEntries(entries);
}

function buildImportRows({ rows, reviewerMap, dedupeChoice }) {
  const grouped = groupBy(rows, (r) => r.courseCode);
  const chosen = [];

  for (const [, group] of grouped.entries()) {
    const sorted = [...group].sort((a, b) => {
      const av = a.completionSerial ?? -Infinity;
      const bv = b.completionSerial ?? -Infinity;
      return dedupeChoice === "latest" ? bv - av : av - bv;
    });
    chosen.push(sorted[0]);
  }

  return chosen.map((r) => ({
    ...r,
    reviewerProfileId: reviewerMap.get(r.reviewer) ?? null,
  }));
}

async function computePlan(importRows) {
  const sourceIds = [...new Set(importRows.map((r) => r.courseCode).filter(Boolean))];
  const existingCourses = await listCoursesBySourceIds(sourceIds);
  const existingBySource = new Map(existingCourses.map((c) => [c.source_course_id, c]));

  let createCourses = 0;
  let updateCourses = 0;
  let assignStaff = 0;
  let upsertResponses = 0;
  let skippedNoReviewer = 0;

  for (const row of importRows) {
    const existing = existingBySource.get(row.courseCode);
    if (!existing) createCourses += 1;
    else updateCourses += 1;

    if (!row.reviewerProfileId) {
      skippedNoReviewer += 1;
      continue;
    }
    assignStaff += 1;
    upsertResponses += 1;
  }

  return {
    rowsSelected: importRows.length,
    createCourses,
    updateCourses,
    assignStaff,
    upsertResponses,
    skippedNoReviewer,
  };
}

function printPlan(plan) {
  console.log("\n=== Planned Operations ===");
  console.log(`Selected rows (after dedupe): ${plan.rowsSelected}`);
  console.log(`Courses to create: ${plan.createCourses}`);
  console.log(`Courses to update: ${plan.updateCourses}`);
  console.log(`Staff assignments: ${plan.assignStaff}`);
  console.log(`Review response upserts: ${plan.upsertResponses}`);
  console.log(`Skipped rows (no reviewer profile): ${plan.skippedNoReviewer}`);
}

async function executeImport({ importRows, adminProfileId, sectionId }) {
  const sourceIds = [...new Set(importRows.map((r) => r.courseCode).filter(Boolean))];
  const existingCourses = await listCoursesBySourceIds(sourceIds);
  const existingBySource = new Map(existingCourses.map((c) => [c.source_course_id, c]));

  for (const row of importRows) {
    if (!row.courseCode || !row.courseTitle) {
      continue;
    }

    let courseId;
    const existing = existingBySource.get(row.courseCode);
    if (!existing) {
      const { data, error } = await sb
        .from("courses")
        .insert({
          source_course_id: row.courseCode,
          title: row.courseTitle,
          term: row.courseTerm || null,
          department: null,
          status: "course_created",
          created_by: adminProfileId,
        })
        .select("id, source_course_id")
        .single();
      if (error || !data) throw new Error(`courses insert failed (${row.courseCode}): ${error?.message}`);
      courseId = data.id;
      existingBySource.set(data.source_course_id, data);
    } else {
      courseId = existing.id;
      const { error } = await sb
        .from("courses")
        .update({
          title: row.courseTitle,
          term: row.courseTerm || null,
          target_course_id: extractBrightspaceCourseId(row.brightspaceUrl),
        })
        .eq("id", courseId);
      if (error) throw new Error(`courses update failed (${row.courseCode}): ${error.message}`);
    }

    if (!row.reviewerProfileId) {
      continue;
    }

    const { error: assignmentError } = await sb.from("course_assignments").upsert(
      {
        course_id: courseId,
        profile_id: row.reviewerProfileId,
        role: "staff",
        assigned_by: adminProfileId,
      },
      { onConflict: "course_id,profile_id,role" },
    );
    if (assignmentError) {
      throw new Error(`course_assignments upsert failed (${row.courseCode}): ${assignmentError.message}`);
    }

    const { error: responseError } = await sb.from("review_responses").upsert(
      {
        course_id: courseId,
        section_id: sectionId,
        responded_by: row.reviewerProfileId,
        response_data: row.responseData,
        status: "submitted",
      },
      { onConflict: "course_id,section_id" },
    );
    if (responseError) {
      throw new Error(`review_responses upsert failed (${row.courseCode}): ${responseError.message}`);
    }
  }
}

async function getAdminProfileId(email) {
  const { data, error } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
  if (error || !data?.id) {
    throw new Error(`Could not find profile for IMPORT_ADMIN_EMAIL="${email}"`);
  }
  return data.id;
}

async function findProfileByEmail(email) {
  const { data, error } = await sb.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (error) throw new Error(`profiles lookup failed (${email}): ${error.message}`);
  return data;
}

async function getReviewMatrixSectionId() {
  const { data, error } = await sb
    .from("review_sections")
    .select("id")
    .eq("key", "review_matrix")
    .maybeSingle();
  if (error || !data?.id) {
    throw new Error('Missing review_sections row for key="review_matrix"');
  }
  return data.id;
}

async function listCoursesBySourceIds(sourceIds) {
  if (sourceIds.length === 0) return [];
  const { data, error } = await sb
    .from("courses")
    .select("id,source_course_id")
    .in("source_course_id", sourceIds);
  if (error) throw new Error(`courses lookup failed: ${error.message}`);
  return data ?? [];
}

function extractBrightspaceCourseId(url) {
  const clean = cleanText(url);
  if (!clean) return null;
  const match = clean.match(/\/(?:home|lessons)\/(\d+)/i);
  return match ? match[1] : null;
}

function cleanText(value) {
  if (value == null) return "";
  return String(value).replace(/\u00a0/g, " ").trim();
}

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    return { headers: [], records: [] };
  }
  const headers = parseCsvLine(lines[0]);
  const records = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    records.push(row);
  }
  return { headers, records };
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function fatal(message) {
  console.error(message);
  process.exit(1);
}
