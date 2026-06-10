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
 *
 * Optional env:
 *   IMPORT_ENV_LABEL      (e.g. dev/prod, default: unknown)
 */

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

const TERM_CODE_TO_LABEL = {
  "10": "Winter",
  "11": "Winter CS",
  "20": "Summer",
  "21": "Spring CS",
  "22": "Summer CS",
  "30": "Fall",
  "31": "Fall CS",
};

const HEADERS = {
  summaryNotes1: "Migration Summary Notes1",
  summaryNotes: "Migration Summary Notes",
  timeRequired: "Time required to complete rview",
  homepageDirect: "Homepage: Direct Link",
  homepageLoads: "Homepage: Status.        Homepage loads correctly",
  homepageTools: "Homepage: Status.Homepage tools function accordingly",
  homepageNotes: "Homepage: Please provide observation notes/findings.",
  modulesOrdered: "Modules: Status.Modules present and logically ordered",
  modulesNoDupes: "Modules: Status.        No duplicate or empty modules",
  modulesNotes:
    "Modules: Please provide both individual direct links to all modules that were not flagged \"pass\" and corresponding observation notes/findings.",
  pagesRender: "Content: Pages.        Pages render correctly",
  pagesRenderNotes:
    "Pages: Please provide both individual direct links to all pages that did not render correctly and corresponding observation notes/findings.",
  pagesFilesOpen: "Content: Pages.Files open correctly",
  pagesFilesNotes:
    "Pages: Please provide both individual direct links to all files that did not open correctly and corresponding observation notes/findings.",
  moodleRefs: "Content: Moodle References.No Moodle references remain",
  moodleRefsNotes: "Pages: Please provide individual direct links to all locations that have references to Moodle.",
  imagesDisplay: "Content: Images.        Images display properly",
  imagesLinks: "Images: Please provide individual direct links to all locations that images are not displaying properly.",
  imagesNotes:
    "Images: Please provide both individual direct links to all images that did not display properly and corresponding observation notes/findings.",
  internalLinks: "Content: Internal Links.        Internal links functional",
  internalLinksNotes:
    "Internal Links: Please provide both individual direct links to all broken internal links and corresponding observation notes/findings.",
  externalLinks: "Content: External Links.        External links functional",
  externalLinksNotes:
    "External Links: Please provide both individual direct links to all broken external links and corresponding observation notes/findings.",
  embeddedMedia: "Content: Embedded Media.Embedded media loads",
  embeddedMediaNotes:
    "Embedded Media: Please provide both individual direct links to all broken embedded media and corresponding observation notes/findings.",
};

const argv = process.argv.slice(2);
const shouldRun = argv.includes("--run");
const csvPath = argv.find((x) => !x.startsWith("--")) ?? DEFAULT_CSV;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const importAdminEmail = process.env.IMPORT_ADMIN_EMAIL?.trim().toLowerCase();
const importEnvLabel = process.env.IMPORT_ENV_LABEL?.trim() || "unknown";

if (!supabaseUrl || !serviceRoleKey) fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
if (!importAdminEmail) fatal("Missing IMPORT_ADMIN_EMAIL.");
if (!existsSync(csvPath)) fatal(`CSV not found: ${csvPath}`);

const rl = readline.createInterface({ input, output });
const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

try {
  const csvText = readFileSync(csvPath, "utf8");
  const { headers, records } = parseCsv(csvText);
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) fatal(`Missing required CSV header: "${h}"`);
  }

  const adminProfileId = await getAdminProfileId(importAdminEmail);
  const sectionIds = await getSectionIdsByKey(["course_metadata", "review_matrix", "syllabus_review", "general_notes"]);
  const normalizedRows = normalizeRows(records);

  const reviewerNames = [...new Set(normalizedRows.map((r) => r.reviewer).filter(Boolean))].sort();
  const courseGroups = groupBy(normalizedRows, (r) => r.courseCode);
  const duplicateCourseCodes = [...courseGroups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([code, rows]) => ({ code, count: rows.length }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  console.log("\n=== TA Review Import Prep ===");
  console.log(`CSV: ${csvPath}`);
  console.log(`CSV SHA256: ${sha256(csvText)}`);
  console.log(`Env Label: ${importEnvLabel}`);
  console.log(`Acting Admin: ${importAdminEmail} (${adminProfileId})`);
  console.log(`Rows: ${normalizedRows.length}`);
  console.log(`Distinct reviewers: ${reviewerNames.length}`);
  console.log(`Distinct course codes: ${courseGroups.size}`);
  console.log(`Duplicate course codes: ${duplicateCourseCodes.length}`);
  if (duplicateCourseCodes.length > 0) {
    console.log("Top duplicates:");
    for (const d of duplicateCourseCodes.slice(0, 10)) console.log(`  - ${d.code}: ${d.count}`);
  }

  const dedupeChoice = await askDedupeChoice();
  const reviewerMap = await askReviewerMappings(reviewerNames);

  const importRows = buildImportRows({ rows: normalizedRows, reviewerMap, dedupeChoice });
  const unresolvedReviewers = [...new Set(importRows.filter((r) => !r.reviewerProfileId).map((r) => r.reviewer))];
  if (unresolvedReviewers.length > 0) {
    console.log("\nReviewers without profile match (rows will be skipped):");
    for (const name of unresolvedReviewers) console.log(`  - ${name}`);
  }

  const plan = await computePlan(importRows);
  printPlan(plan);
  printSampleMappings(importRows);

  if (!shouldRun) {
    console.log("\nDry-run only. Re-run with --run to perform writes.");
    process.exit(0);
  }

  const proceed = await rl.question("\nProceed with live import? Type YES to continue: ");
  if (proceed.trim() !== "YES") {
    console.log("Aborted.");
    process.exit(0);
  }

  const stats = await executeImport({ importRows, adminProfileId, sectionIds });
  console.log("\n=== Import Complete ===");
  console.log(`Courses created: ${stats.createdCourses}`);
  console.log(`Courses updated: ${stats.updatedCourses}`);
  console.log(`Assignments upserted: ${stats.assignmentsUpserted}`);
  console.log(`Section responses upserted: ${stats.responsesUpserted}`);
  console.log(`Skipped missing reviewer mapping: ${stats.skippedNoReviewer}`);
  console.log(`Run timestamp: ${new Date().toISOString()}`);
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
    const row = Object.fromEntries(Object.entries(r).map(([k, v]) => [normalizeHeader(k), v]));
    const completionRaw = cleanText(row["Completion time"]);
    const completionSerial = Number(completionRaw);
    return {
      csvRow: idx + 2,
      courseCode: cleanText(row["Course Code"]),
      courseTitle: cleanText(row["Course Title"]),
      courseTermRaw: cleanText(row["Course Term"]),
      courseTermDisplay: normalizeTermDisplay(cleanText(row["Course Term"])),
      courseSection: cleanText(row["Course Section(s)"]),
      brightspaceUrl: cleanText(row["Brightspace Course URL"]),
      moodleUrl: cleanText(row["Moodle Course URL"]),
      reviewer: cleanText(row["Reviewer"]),
      completionSerial: Number.isFinite(completionSerial) ? completionSerial : null,
      rawRow: row,
      rawResponseData: buildRawResponseData(row),
    };
  });
}

function buildRawResponseData(row) {
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

  return chosen.map((row) => {
    const sectionPayloads = buildSectionPayloads(row);
    return {
      ...row,
      reviewerProfileId: reviewerMap.get(row.reviewer) ?? null,
      sectionPayloads,
    };
  });
}

function buildSectionPayloads(row) {
  const overallTime = parseDurationSeconds(row.rawRow[HEADERS.timeRequired]);

  const metadataPayload = {
    term: row.courseTermDisplay,
    section_numbers: parseSectionNumbers(row.courseSection),
    brightspace_url: safeUrlOrBlank(row.brightspaceUrl),
    moodle_url: safeUrlOrBlank(row.moodleUrl),
    migration_notes: combineNotes([row.rawRow[HEADERS.summaryNotes1], row.rawRow[HEADERS.summaryNotes]]),
    overall_time_spent_seconds: overallTime,
  };

  const matrixItems = [
    buildMatrixItem("A1", row.rawRow[HEADERS.homepageLoads], row.rawRow[HEADERS.homepageNotes], row.rawRow[HEADERS.homepageDirect]),
    buildMatrixItem("A2", row.rawRow[HEADERS.homepageTools], row.rawRow[HEADERS.homepageNotes], row.rawRow[HEADERS.homepageDirect]),
    buildMatrixItem("A3", row.rawRow[HEADERS.modulesOrdered], row.rawRow[HEADERS.modulesNotes], row.rawRow[HEADERS.homepageDirect]),
    buildMatrixItem("A4", row.rawRow[HEADERS.modulesNoDupes], row.rawRow[HEADERS.modulesNotes], row.rawRow[HEADERS.homepageDirect]),
    buildMatrixItem("B1", row.rawRow[HEADERS.pagesRender], row.rawRow[HEADERS.pagesRenderNotes], row.rawRow[HEADERS.pagesRenderNotes]),
    buildMatrixItem("B2", row.rawRow[HEADERS.pagesFilesOpen], row.rawRow[HEADERS.pagesFilesNotes], row.rawRow[HEADERS.pagesFilesNotes]),
    buildMatrixItem("B3", row.rawRow[HEADERS.imagesDisplay], row.rawRow[HEADERS.imagesNotes], row.rawRow[HEADERS.imagesLinks]),
    buildMatrixItem("B4", row.rawRow[HEADERS.moodleRefs], row.rawRow[HEADERS.moodleRefsNotes], row.rawRow[HEADERS.moodleRefsNotes]),
    buildMatrixItem("C1", row.rawRow[HEADERS.internalLinks], row.rawRow[HEADERS.internalLinksNotes], row.rawRow[HEADERS.internalLinksNotes]),
    buildMatrixItem("C2", row.rawRow[HEADERS.embeddedMedia], row.rawRow[HEADERS.embeddedMediaNotes], row.rawRow[HEADERS.embeddedMediaNotes]),
    buildMatrixItem("C3", row.rawRow[HEADERS.externalLinks], row.rawRow[HEADERS.externalLinksNotes], row.rawRow[HEADERS.externalLinksNotes]),
  ];

  const reviewMatrixPayload = {
    items: matrixItems,
    time_spent_seconds: overallTime,
    overall_time_spent_seconds: overallTime,
  };

  const syllabusPayload = {
    instructor_id: "",
    instructor_email: "",
    syllabus_items: ["S1", "S2", "S3", "S4"].map((item_id) => ({ item_id, ta_status: "pending", notes: "", direct_link: "" })),
    gradebook_items: ["G1", "G2", "G3", "G4"].map((item_id) => ({ item_id, status: "na", notes: "", direct_link: "" })),
    time_spent_seconds: 0,
    overall_time_spent_seconds: overallTime,
  };

  const issues = matrixItems
    .filter((i) => ["fix_needed", "missing", "escalate"].includes(i.status))
    .map((item) => ({
      id: cryptoRandomId(item.item_id),
      type: "Review Matrix",
      location: item.item_id,
      severity: item.status === "escalate" || item.status === "missing" ? "critical" : "major",
      owner: "TA",
      status: "open",
      description: item.notes || `Imported issue from ${item.item_id}`,
      direct_link: item.direct_link,
      created_at: new Date().toISOString(),
    }));

  return {
    course_metadata: metadataPayload,
    review_matrix: reviewMatrixPayload,
    syllabus_review: syllabusPayload,
    general_notes: { issues },
  };
}

function buildMatrixItem(itemId, statusRaw, notesRaw, linkRaw) {
  return {
    item_id: itemId,
    status: normalizeMatrixStatus(statusRaw),
    notes: normalizeNote(notesRaw),
    direct_link: normalizeLink(linkRaw),
  };
}

function normalizeMatrixStatus(raw) {
  const text = normalizeFreeText(raw);
  if (!text) return "na";
  if (["na", "n/a", "none"].includes(text)) return "na";

  if (text.includes("escalat")) return "escalate";
  if (text.includes("missing") || text.includes("not found")) return "missing";

  const fixWords = ["fix", "broken", "error", "incorrect", "not ", "failed", "404", "issue"];
  if (fixWords.some((w) => text.includes(w))) return "fix_needed";

  const passWords = ["pass", "yes", "ok", "loads", "functional", "present", "correct", "properly", "render"];
  if (passWords.some((w) => text.includes(w))) return "pass";

  return "na";
}

function normalizeNote(raw) {
  const v = cleanText(raw);
  if (!v) return "";
  const n = normalizeFreeText(v);
  if (n === "none" || n === "n/a" || n === "na") return "";
  return v;
}

function normalizeLink(raw) {
  const v = normalizeNote(raw);
  if (!v) return "";
  const firstUrl = v.match(/https?:\/\/\S+/i)?.[0] ?? "";
  return safeUrlOrBlank(firstUrl);
}

function parseSectionNumbers(inputValue) {
  const t = cleanText(inputValue);
  if (!t) return [];
  return t.split(/[;,/]/).map((x) => cleanText(x)).filter(Boolean);
}

function combineNotes(values) {
  return values.map((v) => normalizeNote(v)).filter(Boolean).join("\n\n");
}

function parseDurationSeconds(raw) {
  const t = normalizeFreeText(raw);
  if (!t) return 0;

  const hhmm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmm) {
    const h = Number(hhmm[1] ?? 0);
    const m = Number(hhmm[2] ?? 0);
    const s = Number(hhmm[3] ?? 0);
    return Math.max(0, h * 3600 + m * 60 + s);
  }

  const hours = Number((t.match(/(\d+(?:\.\d+)?)\s*h(?:our)?/i) ?? [])[1] ?? 0);
  const mins = Number((t.match(/(\d+(?:\.\d+)?)\s*m(?:in)?/i) ?? [])[1] ?? 0);
  if (hours || mins) return Math.round(hours * 3600 + mins * 60);

  const numberOnly = Number(t);
  if (Number.isFinite(numberOnly) && numberOnly > 0) {
    // Assume minutes if plain numeric (legacy form behavior).
    return Math.round(numberOnly * 60);
  }
  return 0;
}

function normalizeTermDisplay(termRaw) {
  const t = cleanText(termRaw);
  if (!t) return "";
  const match = t.match(/^(\d{4})(\d{2})$/);
  if (!match) return t;
  const year = match[1];
  const code = match[2];
  const label = TERM_CODE_TO_LABEL[code];
  return label ? `${label} ${year}` : t;
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
    upsertResponses += 4;
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
  console.log(`Review response upserts (4 sections each): ${plan.upsertResponses}`);
  console.log(`Skipped rows (no reviewer profile): ${plan.skippedNoReviewer}`);
}

function printSampleMappings(importRows) {
  console.log("\n=== Sample Mapping Preview (first 3 rows) ===");
  for (const row of importRows.slice(0, 3)) {
    const issuesCount = row.sectionPayloads.general_notes.issues.length;
    const firstStatuses = row.sectionPayloads.review_matrix.items.slice(0, 4).map((i) => `${i.item_id}:${i.status}`).join(", ");
    console.log(`- ${row.courseCode} | term: ${row.courseTermRaw} -> ${row.courseTermDisplay || "(blank)"} | issues: ${issuesCount}`);
    console.log(`  matrix: ${firstStatuses}`);
  }
}

async function executeImport({ importRows, adminProfileId, sectionIds }) {
  const sourceIds = [...new Set(importRows.map((r) => r.courseCode).filter(Boolean))];
  const existingCourses = await listCoursesBySourceIds(sourceIds);
  const existingBySource = new Map(existingCourses.map((c) => [c.source_course_id, c]));

  const stats = {
    createdCourses: 0,
    updatedCourses: 0,
    assignmentsUpserted: 0,
    responsesUpserted: 0,
    skippedNoReviewer: 0,
  };

  for (const row of importRows) {
    if (!row.courseCode || !row.courseTitle) continue;

    let courseId;
    const existing = existingBySource.get(row.courseCode);
    if (!existing) {
      const { data, error } = await sb
        .from("courses")
        .insert({
          source_course_id: row.courseCode,
          title: row.courseTitle,
          term: row.courseTermDisplay || row.courseTermRaw || null,
          target_course_id: extractBrightspaceCourseId(row.brightspaceUrl),
          department: null,
          status: "course_created",
          created_by: adminProfileId,
        })
        .select("id, source_course_id")
        .single();
      if (error || !data) throw new Error(`courses insert failed (${row.courseCode}): ${error?.message}`);
      courseId = data.id;
      existingBySource.set(data.source_course_id, data);
      stats.createdCourses += 1;
    } else {
      courseId = existing.id;
      const { error } = await sb
        .from("courses")
        .update({
          title: row.courseTitle,
          term: row.courseTermDisplay || row.courseTermRaw || null,
          target_course_id: extractBrightspaceCourseId(row.brightspaceUrl),
        })
        .eq("id", courseId);
      if (error) throw new Error(`courses update failed (${row.courseCode}): ${error.message}`);
      stats.updatedCourses += 1;
    }

    if (!row.reviewerProfileId) {
      stats.skippedNoReviewer += 1;
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
    if (assignmentError) throw new Error(`course_assignments upsert failed (${row.courseCode}): ${assignmentError.message}`);
    stats.assignmentsUpserted += 1;

    for (const [key, payload] of Object.entries(row.sectionPayloads)) {
      const sectionId = sectionIds[key];
      const { error: responseError } = await sb.from("review_responses").upsert(
        {
          course_id: courseId,
          section_id: sectionId,
          responded_by: row.reviewerProfileId,
          response_data: payload,
          status: "submitted",
        },
        { onConflict: "course_id,section_id" },
      );
      if (responseError) throw new Error(`review_responses upsert failed (${row.courseCode}/${key}): ${responseError.message}`);
      stats.responsesUpserted += 1;
    }
  }

  return stats;
}

async function getAdminProfileId(email) {
  const { data, error } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
  if (error || !data?.id) throw new Error(`Could not find profile for IMPORT_ADMIN_EMAIL="${email}"`);
  return data.id;
}

async function findProfileByEmail(email) {
  const { data, error } = await sb.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (error) throw new Error(`profiles lookup failed (${email}): ${error.message}`);
  return data;
}

async function getSectionIdsByKey(keys) {
  const { data, error } = await sb.from("review_sections").select("id,key").in("key", keys);
  if (error) throw new Error(`review_sections lookup failed: ${error.message}`);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.id]));
  for (const key of keys) {
    if (!map[key]) throw new Error(`Missing review_sections row for key="${key}"`);
  }
  return map;
}

async function listCoursesBySourceIds(sourceIds) {
  if (sourceIds.length === 0) return [];
  const { data, error } = await sb.from("courses").select("id,source_course_id").in("source_course_id", sourceIds);
  if (error) throw new Error(`courses lookup failed: ${error.message}`);
  return data ?? [];
}

function extractBrightspaceCourseId(url) {
  const clean = cleanText(url);
  if (!clean) return null;
  const match = clean.match(/\/d2l\/(?:home|le\/lessons)\/(\d+)/i);
  return match ? match[1] : null;
}

function normalizeHeader(header) {
  return cleanText(header).replace(/\s+/g, " ");
}

function safeUrlOrBlank(value) {
  const v = cleanText(value);
  if (!v) return "";
  try {
    const url = new URL(v);
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeFreeText(value) {
  return cleanText(value).toLowerCase();
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
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) return { headers: [], records: [] };

  const headers = parseCsvLine(lines[0]).map((h) => normalizeHeader(h));
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

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function cryptoRandomId(seed) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `imp_${seed}_${Date.now()}_${rand}`;
}

function fatal(message) {
  console.error(message);
  process.exit(1);
}
