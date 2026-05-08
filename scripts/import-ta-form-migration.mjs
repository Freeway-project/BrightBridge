/**
 * Import TA form migration CSV into BrightBridge.
 *
 * Modes:
 *   - Dry run (default): analyze + report only
 *   - Live run (--run): writes courses, staff assignments, review_responses, and status events
 *
 * Usage:
 *   node scripts/import-ta-form-migration.mjs "Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv"
 *   node scripts/import-ta-form-migration.mjs "Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv" --run
 *
 * Notes:
 *   - Designed for TA form CSV headers (Responses-Table 1.csv shape)
 *   - Never performs orphan-course enrichment
 *   - Writes run reports to docs/migration-runs/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_CSV = "Gate 01 (QI) – TA Course Review Form (2)/Responses-Table 1.csv";
const REPORT_DIR = "docs/migration-runs";
const DEFAULT_ADMIN_EMAIL = "admin@coursebridge.dev";

const VALID_TERM_CODES = new Set(["10", "11", "20", "21", "22", "30", "31"]);
const EMPTY_VALUES = new Set(["", "na", "n/a", "null", "none", "blank", "-"]);
const REVIEWER_EMAIL_MAP = {
  "matthew t.": "gtindogan@okanagan.bc.ca",
  "nick u.": "nusatenco@okanagan.bc.ca",
  "nick c.": "ncornell@okanagan.bc.ca",
  "filip s.": "fshakalau@okanagan.bc.ca",
  "alfiya k.": "akhanum@okanagan.bc.ca",
  "mikhail f.": "mikhail.fokin@myokanagan.bc.ca",
  "ava r.": "aroy@okanaganbc.ca",
};

const MATRIX_MAP = [
  { item_id: "A1", statusCol: "Homepage: Status.        Homepage loads correctly      ", notesCol: "Homepage: Please provide observation notes/findings.", linkCol: "Homepage: Direct Link" },
  { item_id: "A2", statusCol: "Homepage: Status.Homepage tools function accordingly", notesCol: "Homepage: Please provide observation notes/findings.", linkCol: "Homepage: Direct Link" },
  { item_id: "A3", statusCol: "Modules: Status.Modules present and logically ordered ", notesCol: 'Modules: Please provide both individual direct links to all modules that were not flagged "pass" and corresponding observation notes/findings.', linkCol: 'Modules: Please provide both individual direct links to all modules that were not flagged "pass" and corresponding observation notes/findings.' },
  { item_id: "A4", statusCol: "Modules: Status.        No duplicate or empty modules      ", notesCol: 'Modules: Please provide both individual direct links to all modules that were not flagged "pass" and corresponding observation notes/findings.', linkCol: 'Modules: Please provide both individual direct links to all modules that were not flagged "pass" and corresponding observation notes/findings.' },
  { item_id: "B1", statusCol: "Content: Pages.        Pages render correctly", notesCol: "Pages: Please provide both individual direct links to all pages that did not render correctly and corresponding observation notes/findings.", linkCol: "Pages: Please provide both individual direct links to all pages that did not render correctly and corresponding observation notes/findings." },
  { item_id: "B2", statusCol: "Content: Pages.Files open correctly", notesCol: "Pages: Please provide both individual direct links to all files that did not open correctly and corresponding observation notes/findings.", linkCol: "Pages: Please provide both individual direct links to all files that did not open correctly and corresponding observation notes/findings." },
  { item_id: "B3", statusCol: "Content: Images.        Images display properly      ", notesCol: "Images: Please provide both individual direct links to all images that did not display properly and corresponding observation notes/findings.", linkCol: "Images: Please provide individual direct links to all locations that images are not displaying properly." },
  { item_id: "B4", statusCol: "Content: Moodle References.No Moodle references remain", notesCol: "Pages: Please provide individual direct links to all locations that have references to Moodle.", linkCol: "Pages: Please provide individual direct links to all locations that have references to Moodle." },
  { item_id: "C1", statusCol: "Content: Internal Links.        Internal links functional      ", notesCol: "Internal Links: Please provide both individual direct links to all broken internal links and corresponding observation notes/findings.", linkCol: "Internal Links: Please provide both individual direct links to all broken internal links and corresponding observation notes/findings." },
  { item_id: "C2", statusCol: "Content: Embedded Media.Embedded media loads", notesCol: "Embedded Media: Please provide both individual direct links to all broken embedded media and corresponding observation notes/findings.", linkCol: "Embedded Media: Please provide both individual direct links to all broken embedded media and corresponding observation notes/findings." },
  { item_id: "C3", statusCol: "Content: External Links.        External links functional      ", notesCol: "External Links: Please provide both individual direct links to all broken external links and corresponding observation notes/findings.", linkCol: "External Links: Please provide both individual direct links to all broken external links and corresponding observation notes/findings." },
];

loadEnvFiles([".env.local", ".env", "apps/web/.env.local", "apps/web/.env"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV;
const runMode = process.argv.includes("--run");
const rollbackFile = (() => { const i = process.argv.indexOf("--rollback"); return i !== -1 ? process.argv[i + 1] : null; })();
const adminEmail = process.env.IMPORT_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  fatal("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
if (!rollbackFile && !existsSync(csvPath)) {
  fatal(`CSV not found: ${csvPath}`);
}

const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// ── Rollback mode ────────────────────────────────────────────────────────────
if (rollbackFile) {
  if (!existsSync(rollbackFile)) fatal(`Rollback file not found: ${rollbackFile}`);
  const snap = JSON.parse(readFileSync(rollbackFile, "utf8"));
  console.log(`\n=== Rollback from ${rollbackFile} ===`);
  console.log(`Snapshot taken : ${snap.snapshotAt}`);
  console.log(`New courses    : ${snap.newCourseIds.length} (will be deleted)`);
  console.log(`Updated courses: ${snap.updatedCourses.length} (will be restored)\n`);

  for (const c of snap.updatedCourses) {
    const { error } = await sb.from("courses").update({
      source_course_id: c.source_course_id,
      target_course_id: c.target_course_id,
      term: c.term,
      status: c.status,
    }).eq("id", c.id);
    if (error) console.error(`  WARN restore course ${c.id}: ${error.message}`);
    else console.log(`  restored course ${c.id} (${c.title})`);
  }

  for (const rr of snap.reviewResponses) {
    if (rr._existed) {
      const { error } = await sb.from("review_responses").update({
        data: rr.data, status: rr.status,
      }).eq("id", rr.id);
      if (error) console.error(`  WARN restore response ${rr.id}: ${error.message}`);
    } else {
      const { error } = await sb.from("review_responses").delete().eq("id", rr.id);
      if (error) console.error(`  WARN delete response ${rr.id}: ${error.message}`);
    }
  }

  for (const a of snap.assignments) {
    if (!a._existed) {
      const { error } = await sb.from("course_assignments").delete()
        .eq("course_id", a.course_id).eq("profile_id", a.profile_id).eq("role", a.role);
      if (error) console.error(`  WARN delete assignment ${a.course_id}/${a.role}: ${error.message}`);
    }
  }

  if (snap.newCourseIds.length > 0) {
    const { error } = await sb.from("courses").delete().in("id", snap.newCourseIds);
    if (error) console.error(`  WARN delete new courses: ${error.message}`);
    else console.log(`  deleted ${snap.newCourseIds.length} new courses`);
  }

  console.log("\nRollback complete.");
  process.exit(0);
}
// ────────────────────────────────────────────────────────────────────────────

const startedAt = new Date().toISOString();
console.log(`\n=== TA Migration Importer ===`);
console.log(`Mode : ${runMode ? "LIVE RUN" : "DRY-RUN"}`);
console.log(`CSV  : ${csvPath}`);
console.log(`Actor: ${adminEmail}\n`);

const { headers, records } = parseCsv(readFileSync(csvPath, "utf8"));
const requiredHeaders = [
  "Course Code",
  "Course Title",
  "Brightspace Course URL",
  "Moodle Course URL",
  "Reviewer",
];
for (const h of requiredHeaders) {
  if (!headers.includes(h)) fatal(`Missing required CSV header: ${h}`);
}

const rows = records.map((row, idx) => normalizeRow(row, idx + 2));

const stats = {
  totalRows: rows.length,
  codeTitleSwaps: rows.filter((r) => r.swappedCourseCodeTitle).length,
  blankTerms: rows.filter((r) => !r.term).length,
  urlAutoFixes: rows.reduce((n, r) => n + r.urlAutoFixes.length, 0),
  problematicRows: rows.filter((r) => r.issues.length > 0).length,
};

console.log(`Rows total          : ${stats.totalRows}`);
console.log(`Code/title swaps    : ${stats.codeTitleSwaps}`);
console.log(`Blank terms         : ${stats.blankTerms}`);
console.log(`URL auto-fix cells  : ${stats.urlAutoFixes}`);
console.log(`Problematic rows    : ${stats.problematicRows}`);

const runResult = {
  updatedExisting: 0,
  createdNew: 0,
  staffAssignmentsAdded: 0,
  reviewResponsesUpserted: 0,
  statusEventsInserted: 0,
  rowsFailed: 0,
};

const { data: adminProfile, error: adminErr } = await sb
  .from("profiles")
  .select("id, role")
  .eq("email", adminEmail)
  .single();
if (adminErr || !adminProfile) fatal(`Admin profile not found: ${adminEmail}`);
const adminId = adminProfile.id;
const adminRole = adminProfile.role === "super_admin" ? "super_admin" : "admin_full";

const sectionByKey = await getSectionMap(sb, ["course_metadata", "review_matrix", "general_notes"]);

const taEmails = [...new Set(rows.map((r) => r.taEmail).filter(Boolean))];
const taProfiles = await fetchProfilesByEmail(sb, taEmails);
const taProfileByEmail = new Map(taProfiles.map((p) => [p.email, p]));

const dbCourses = await loadCourses(sb);
const titleToCourse = new Map(dbCourses.map((c) => [norm(c.title), c]));

if (runMode) {
  // ── pg_dump backup before any writes ────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("⚠  DATABASE_URL not set — skipping pg_dump backup. Set it to enable automatic DB backup.");
  } else {
    mkdirSync(REPORT_DIR, { recursive: true });
    const dumpTs = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpPath = `${REPORT_DIR}/pg-backup-${dumpTs}.sql`;
    const tables = ["courses", "course_assignments", "review_responses", "course_status_events"];
    const tableArgs = tables.map((t) => `--table=${t}`).join(" ");
    console.log(`\nBacking up DB → ${dumpPath} ...`);
    try {
      execSync(`pg_dump "${dbUrl}" --no-owner --no-acl ${tableArgs} -f "${dumpPath}"`, { stdio: "inherit" });
      console.log(`DB backup saved → ${dumpPath}`);
      console.log(`To restore: psql "${dbUrl}" < ${dumpPath}\n`);
    } catch (e) {
      console.error(`pg_dump failed: ${e.message}`);
      console.error("Aborting — fix DATABASE_URL or pg_dump version mismatch before running live.");
      process.exit(1);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Capture rollback snapshot before any writes ──────────────────────────
  const matchedCourses = rows
    .map((r) => titleToCourse.get(norm(r.courseRef)))
    .filter(Boolean);
  const matchedIds = matchedCourses.map((c) => c.id);

  const { data: fullCourses } = matchedIds.length > 0
    ? await sb.from("courses").select("id,title,source_course_id,target_course_id,term,status").in("id", matchedIds)
    : { data: [] };

  const { data: existingAssignments } = matchedIds.length > 0
    ? await sb.from("course_assignments").select("id,course_id,profile_id,role").in("course_id", matchedIds)
    : { data: [] };

  const { data: existingResponses } = matchedIds.length > 0
    ? await sb.from("review_responses").select("id,course_id,section_id,user_id,data,status").in("course_id", matchedIds)
    : { data: [] };

  const snapshotTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = `${REPORT_DIR}/rollback-${snapshotTimestamp}.json`;
  const snapshot = {
    snapshotAt: new Date().toISOString(),
    csvPath,
    newCourseIds: [],  // filled in during run as new courses are created
    updatedCourses: fullCourses ?? [],
    assignments: (existingAssignments ?? []).map((a) => ({ ...a, _existed: true })),
    reviewResponses: (existingResponses ?? []).map((r) => ({ ...r, _existed: true })),
  };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nRollback snapshot saved → ${snapshotPath}`);
  console.log(`To undo this run:  node scripts/import-ta-form-migration.mjs --rollback ${snapshotPath}\n`);
  // ─────────────────────────────────────────────────────────────────────────

  for (const row of rows) {
    try {
      let course = titleToCourse.get(norm(row.courseRef));
      let prevStatus = course?.status ?? null;
      const nextStatus = row.taEmail ? "submitted_to_admin" : (course?.status ?? "course_created");
      const updatePayload = {
        source_course_id: row.courseRef,
        target_course_id: row.brightspaceRef || null,
        title: row.courseRef,
        term: row.term,
        status: nextStatus,
        created_by: adminId,
      };

      if (!course) {
        const { data, error } = await sb.from("courses").insert(updatePayload).select("id, title, status").single();
        if (error) throw new Error(`course insert: ${error.message}`);
        course = data;
        titleToCourse.set(norm(row.courseRef), course);
        snapshot.newCourseIds.push(course.id);
        runResult.createdNew++;
      } else {
        const { error } = await sb
          .from("courses")
          .update({
            source_course_id: updatePayload.source_course_id,
            target_course_id: updatePayload.target_course_id,
            term: updatePayload.term,
            status: updatePayload.status,
          })
          .eq("id", course.id);
        if (error) throw new Error(`course update: ${error.message}`);
        runResult.updatedExisting++;
      }

      const taProfile = row.taEmail ? taProfileByEmail.get(row.taEmail) : null;
      if (taProfile) {
        const { error: asgErr } = await sb.from("course_assignments").upsert(
          {
            course_id: course.id,
            profile_id: taProfile.id,
            role: "staff",
            assigned_by: adminId,
          },
          { onConflict: "course_id,profile_id,role", ignoreDuplicates: true }
        );
        if (asgErr) throw new Error(`assignment upsert: ${asgErr.message}`);
        runResult.staffAssignmentsAdded++;

        await insertEvent(sb, {
          courseId: course.id,
          fromStatus: prevStatus,
          toStatus: "assigned_to_ta",
          actorId: adminId,
          actorRole: adminRole,
          note: "Imported from TA form CSV — assigned by admin.",
        });
        runResult.statusEventsInserted++;

        await insertEvent(sb, {
          courseId: course.id,
          fromStatus: "assigned_to_ta",
          toStatus: "submitted_to_admin",
          actorId: taProfile.id,
          actorRole: "standard_user",
          note: "Imported historical TA submission from CSV.",
        });
        runResult.statusEventsInserted++;
      }

      const metadataData = {
        term: row.term ?? "",
        section_numbers: parseSections(row.courseSections),
        brightspace_url: row.brightspaceUrl,
        moodle_url: row.moodleUrl,
        migration_notes: combineNotes(row.migrationNotes1, row.migrationNotes2),
        overall_time_spent_seconds: parseDurationToSeconds(row.timeRequired),
      };
      const matrixData = {
        items: buildReviewMatrixItems(row.raw),
        time_spent_seconds: 0,
        overall_time_spent_seconds: parseDurationToSeconds(row.timeRequired),
      };
      const issueData = {
        issues: buildIssues(matrixData.items),
      };

      const responderId = taProfile?.id ?? adminId;
      await upsertReviewResponse(sb, course.id, sectionByKey.get("course_metadata"), responderId, metadataData, "submitted");
      await upsertReviewResponse(sb, course.id, sectionByKey.get("review_matrix"), responderId, matrixData, "submitted");
      await upsertReviewResponse(sb, course.id, sectionByKey.get("general_notes"), responderId, issueData, "submitted");
      runResult.reviewResponsesUpserted += 3;
    } catch (error) {
      row.issues.push(`run failure: ${error.message ?? String(error)}`);
      runResult.rowsFailed++;
    }
  }
}

const report = {
  title: "TA Form Migration Run",
  startedAt,
  finishedAt: new Date().toISOString(),
  mode: runMode ? "run" : "dry-run",
  environment: inferEnvironment(supabaseUrl),
  csvPath,
  adminActorEmail: adminEmail,
  summary: {
    ...stats,
    ...runResult,
  },
  notes: [
    "Orphan-course enrichment is intentionally disabled in this importer.",
    "Reviewer mapping is authoritative for staff assignment in TA form imports.",
  ],
  problematicRows: rows
    .filter((r) => r.issues.length > 0)
    .map((r) => ({
      row: r.rowNumber,
      courseRef: r.courseRef,
      reviewer: r.reviewer,
      issues: r.issues,
      urlAutoFixes: r.urlAutoFixes,
    })),
  involvedCourses: rows.map((r) => ({
    row: r.rowNumber,
    courseRef: r.courseRef,
    reviewer: r.reviewer,
    taEmail: r.taEmail,
    term: r.term,
  })),
};

if (runMode && typeof snapshot !== "undefined") {
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nRollback snapshot updated → ${snapshotPath}`);
  console.log(`To undo: node scripts/import-ta-form-migration.mjs --rollback ${snapshotPath}`);
}
writeRunReports(report);
console.log("\nRun summary:");
console.log(JSON.stringify(report.summary, null, 2));
console.log(`\nReport files written under ${REPORT_DIR}/`);

function normalizeRow(raw, rowNumber) {
  const courseCode = text(raw["Course Code"]);
  const courseTitle = text(raw["Course Title"]);
  const moodle = text(raw.Moodle);
  const courseRefResolved = resolveCourseRef(moodle, courseCode, courseTitle);
  const term = extractTermCode(text(raw["Course Term"]), courseRefResolved.ref);

  const moodleUrl = normalizeUrl(text(raw["Moodle Course URL"]));
  const brightspaceUrl = normalizeUrl(text(raw["Brightspace Course URL"]));
  const brightspaceRef = extractBrightspaceRef(brightspaceUrl);

  const taEmail = resolveTaEmail(raw);
  const reviewer = text(raw.Reviewer);

  const issues = [];
  if (!reviewer) issues.push("missing reviewer");
  if (!taEmail) issues.push("unmapped reviewer/TA email");
  if (!term) issues.push("blank or invalid term");
  if (!courseRefResolved.ref) issues.push("missing course reference");

  return {
    raw,
    rowNumber,
    reviewer,
    taEmail,
    courseRef: courseRefResolved.ref,
    swappedCourseCodeTitle: courseRefResolved.swapped,
    courseSections: text(raw["Course Section(s)"]),
    term,
    moodleUrl,
    brightspaceUrl,
    brightspaceRef,
    migrationNotes1: text(raw["Migration Summary Notes1"]),
    migrationNotes2: text(raw["Migration Summary Notes"]),
    timeRequired: text(raw["Time required to complete rview"]),
    issues,
    urlAutoFixes: collectUrlFixes(raw),
  };
}

function buildReviewMatrixItems(row) {
  return MATRIX_MAP.map((m) => {
    const statusRaw = text(row[m.statusCol]);
    const notesRaw = text(row[m.notesCol]);
    const linkRaw = text(row[m.linkCol]);
    const { url, noteTail } = splitLinkAndNote(linkRaw);
    return {
      item_id: m.item_id,
      status: normalizeStatus(statusRaw),
      notes: joinNotes(notesRaw, noteTail),
      direct_link: normalizeUrl(url),
    };
  });
}

function buildIssues(items) {
  const now = new Date().toISOString();
  return items
    .filter((i) => i.status === "fix_needed" || i.status === "missing" || i.status === "escalate")
    .map((i, index) => ({
      id: `imported-${i.item_id}-${index}`,
      type: "Imported TA Finding",
      location: i.item_id,
      severity: i.status === "escalate" ? "critical" : "major",
      owner: "TA",
      status: "open",
      description: i.notes || `Imported finding for ${i.item_id}`,
      direct_link: i.direct_link || "",
      created_at: now,
    }));
}

async function upsertReviewResponse(sbClient, courseId, sectionId, userId, responseData, status) {
  if (!sectionId) return;
  const { error } = await sbClient
    .from("review_responses")
    .upsert(
      {
        course_id: courseId,
        section_id: sectionId,
        responded_by: userId,
        response_data: responseData,
        status,
      },
      { onConflict: "course_id,section_id" }
    );
  if (error) throw new Error(`review response upsert: ${error.message}`);
}

async function insertEvent(sbClient, input) {
  const { error } = await sbClient.from("course_status_events").insert({
    course_id: input.courseId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    note: input.note,
  });
  if (error) throw new Error(`status event insert: ${error.message}`);
}

async function getSectionMap(sbClient, keys) {
  const { data, error } = await sbClient.from("review_sections").select("id,key").in("key", keys);
  if (error) throw new Error(`review_sections lookup: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.key, r.id]));
}

async function fetchProfilesByEmail(sbClient, emails) {
  if (emails.length === 0) return [];
  const { data, error } = await sbClient
    .from("profiles")
    .select("id,email,role")
    .in("email", emails);
  if (error) throw new Error(`profiles lookup: ${error.message}`);
  return (data ?? []).filter((r) => r.role === "standard_user");
}

async function loadCourses(sbClient) {
  const courses = [];
  let page = 0;
  while (true) {
    const { data, error } = await sbClient
      .from("courses")
      .select("id,title,status")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(`load courses: ${error.message}`);
    if (!data?.length) break;
    courses.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  return courses;
}

function resolveCourseRef(moodle, courseCode, courseTitle) {
  if (moodle) return { ref: moodle, swapped: false };
  if (isWeakCourseCode(courseCode) && looksLikeCourseRef(courseTitle)) {
    return { ref: courseTitle, swapped: true };
  }
  return { ref: courseCode || courseTitle, swapped: false };
}

function resolveTaEmail(rawRow) {
  const email = text(rawRow.Email).toLowerCase();
  if (email && !EMPTY_VALUES.has(email) && email !== "anonymous" && email.includes("@")) {
    return email;
  }
  const reviewer = text(rawRow.Reviewer).toLowerCase();
  return REVIEWER_EMAIL_MAP[reviewer] ?? "";
}

function extractTermCode(rawTerm, normalizedRef) {
  if (/^\d{6}$/.test(rawTerm)) {
    const suffix = rawTerm.slice(4, 6);
    return VALID_TERM_CODES.has(suffix) ? rawTerm : null;
  }
  const match = normalizedRef.match(/(?:^|[._-])(\d{6})(?:$|[._-])/);
  if (!match) return null;
  const code = match[1];
  const suffix = code.slice(4, 6);
  return VALID_TERM_CODES.has(suffix) ? code : null;
}

function normalizeUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (EMPTY_VALUES.has(lower)) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(raw)) return `https://${raw}`;
  return "";
}

function extractBrightspaceRef(url) {
  if (!url) return "";
  const match = url.match(/\/home\/(\d+)/i);
  return match ? match[1] : url;
}

function splitLinkAndNote(value) {
  const raw = text(value);
  if (!raw) return { url: "", noteTail: "" };
  const match = raw.match(/https?:\/\/\S+/i);
  if (!match) return { url: raw, noteTail: "" };
  const url = match[0];
  const tail = raw.replace(url, "").trim();
  return { url, noteTail: tail };
}

function normalizeStatus(value) {
  const v = text(value).toLowerCase();
  if (!v || EMPTY_VALUES.has(v)) return "na";
  if (["pass", "ok", "all good", "good", "done", "all passed", "passed"].includes(v)) return "pass";
  if (["fix needed", "needs fix", "issue", "broken"].some((k) => v.includes(k))) return "fix_needed";
  if (["missing", "not found"].some((k) => v.includes(k))) return "missing";
  if (["escalate", "urgent"].some((k) => v.includes(k))) return "escalate";
  return "na";
}

function collectUrlFixes(rawRow) {
  const out = [];
  const moodleBefore = text(rawRow["Moodle Course URL"]);
  const moodleAfter = normalizeUrl(moodleBefore);
  if (moodleBefore && moodleAfter && moodleBefore !== moodleAfter) {
    out.push({ field: "Moodle Course URL", from: moodleBefore, to: moodleAfter });
  }
  const brightBefore = text(rawRow["Brightspace Course URL"]);
  const brightAfter = normalizeUrl(brightBefore);
  if (brightBefore && brightAfter && brightBefore !== brightAfter) {
    out.push({ field: "Brightspace Course URL", from: brightBefore, to: brightAfter });
  }
  return out;
}

function parseSections(value) {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseDurationToSeconds(value) {
  const v = text(value).toLowerCase();
  if (!v || EMPTY_VALUES.has(v)) return 0;
  const mins = v.match(/(\d+)\s*(min|mins|minute|minutes)/);
  if (mins) return Number(mins[1]) * 60;
  const hrs = v.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hrs) return Math.round(Number(hrs[1]) * 3600);
  const bare = v.match(/^\d+$/);
  if (bare) return Number(bare[0]) * 60;
  return 0;
}

function combineNotes(a, b) {
  return [text(a), text(b)].filter(Boolean).join("\n\n");
}

function joinNotes(a, b) {
  return [text(a), text(b)].filter((s) => s && !EMPTY_VALUES.has(s.toLowerCase())).join("\n");
}

function isWeakCourseCode(code) {
  return !code || /^n\/?a$/i.test(code) || /^\d{1,5}$/.test(code);
}

function looksLikeCourseRef(value) {
  return Boolean(value && (/[A-Za-z].*\d/.test(value) || /\d{6}/.test(value)));
}

function text(v) {
  return String(v ?? "").replace(/\u00a0/g, " ").trim();
}

function norm(v) {
  return text(v).toLowerCase();
}

function inferEnvironment(url) {
  const match = String(url).match(/https:\/\/([^.]+)\.supabase\.co/i);
  return match ? `supabase:${match[1]}` : "unknown";
}

function writeRunReports(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const jsonPath = `${REPORT_DIR}/${stamp}-ta-migration.json`;
  const mdPath = `${REPORT_DIR}/${stamp}-ta-migration.md`;
  const latestJsonPath = `${REPORT_DIR}/latest-ta-migration.json`;

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, markdownReport(report));
}

function markdownReport(report) {
  const lines = [];
  lines.push(`# TA Migration Run`);
  lines.push("");
  lines.push(`- Started: ${report.startedAt}`);
  lines.push(`- Finished: ${report.finishedAt}`);
  lines.push(`- Mode: ${report.mode}`);
  lines.push(`- Environment: ${report.environment}`);
  lines.push(`- CSV: ${report.csvPath}`);
  lines.push(`- Admin actor: ${report.adminActorEmail}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [k, v] of Object.entries(report.summary)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  lines.push("## Problematic Rows");
  lines.push("");
  if (report.problematicRows.length === 0) {
    lines.push("- none");
  } else {
    for (const row of report.problematicRows) {
      lines.push(`- Row ${row.row} (${row.courseRef}): ${row.issues.join("; ")}`);
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  for (const n of report.notes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

function parseCsv(textValue) {
  const text = textValue.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      const hasContent = row.some((v) => String(v).trim().length > 0);
      if (hasContent) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const hasContent = row.some((v) => String(v).trim().length > 0);
    if (hasContent) rows.push(row);
  }

  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0];
  const records = rows.slice(1).map((values) => {
    const record = {};
    for (let j = 0; j < headers.length; j++) record[headers[j]] = values[j] ?? "";
    return record;
  });
  return { headers, records };
}

function fatal(msg) {
  console.error(`\nFATAL: ${msg}`);
  process.exit(1);
}

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
