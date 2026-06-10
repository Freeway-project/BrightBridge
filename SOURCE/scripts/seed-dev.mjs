/**
 * seed-dev.mjs
 *
 * Creates test courses for each workflow stage assigned to dev accounts.
 * Safe to run repeatedly — idempotent via source_course_id.
 * Does NOT touch real user data or real courses.
 *
 * Run from project root:
 *   node scripts/seed-dev.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadEnvFiles([".env.local", ".env.development", ".env", "apps/web/.env.local", "apps/web/.env"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Seed review sections (idempotent) ────────────────────────────────────────
const REVIEW_SECTIONS = [
  { key: "course_metadata",  title: "Course Metadata",   description: "Basic course identity, term, department, and migration metadata.", sort_order: 10 },
  { key: "review_matrix",    title: "Review Matrix",     description: "Structured checklist for migrated course review items.",           sort_order: 20 },
  { key: "syllabus_review",  title: "Syllabus Review",   description: "Syllabus presence, accuracy, links, dates, and Brightspace readiness.", sort_order: 30 },
  { key: "gradebook_review", title: "Gradebook Review",  description: "Gradebook categories, items, weights, visibility, and calculation checks.", sort_order: 40 },
  { key: "general_notes",    title: "General Notes",     description: "Additional reviewer notes not captured in the structured sections.", sort_order: 50 },
];

const { error: sectionsErr } = await sb
  .from("review_sections")
  .upsert(REVIEW_SECTIONS, { onConflict: "key" });

if (sectionsErr) {
  console.error("Failed to seed review_sections:", sectionsErr.message);
  process.exit(1);
}
console.log(`✓ review_sections seeded (${REVIEW_SECTIONS.length} sections)`);

// ── Dev accounts (must already exist in DB) ───────────────────────────────────
const DEV_EMAILS = {
  ta:          "ta@coursebridge.dev",
  admin:       "admin@coursebridge.dev",
  comms:       "communications@coursebridge.dev",
  instructor:  "instructor@coursebridge.dev",
  superAdmin:  "superadmin@coursebridge.dev",
};

// ── Load dev profile IDs ──────────────────────────────────────────────────────
const { data: devProfiles, error: profileErr } = await sb
  .from("profiles")
  .select("id, email, role")
  .in("email", Object.values(DEV_EMAILS));

if (profileErr) { console.error("Could not load dev profiles:", profileErr.message); process.exit(1); }

const pid = {};
for (const p of devProfiles) {
  const key = Object.entries(DEV_EMAILS).find(([, v]) => v === p.email)?.[0];
  if (key) pid[key] = p.id;
}

const missing = Object.keys(DEV_EMAILS).filter(k => !pid[k]);
if (missing.length) {
  console.error("Missing dev accounts in DB:", missing.join(", "));
  console.error("Run the app or create them via the super admin UI first.");
  process.exit(1);
}

// ── Test courses — one per workflow stage ─────────────────────────────────────
const courses = [
  {
    source_course_id: "DEV-001",
    title: "DEV — Newly Created (no TA yet)",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "course_created",
    assignments: [],
  },
  {
    source_course_id: "DEV-002",
    title: "DEV — Assigned to TA",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "assigned_to_ta",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-003",
    title: "DEV — TA Review In Progress",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "ta_review_in_progress",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-004",
    title: "DEV — Submitted to Admin",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "submitted_to_admin",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-005",
    title: "DEV — Admin Requested Fixes",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "admin_changes_requested",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-006",
    title: "DEV — Ready for Instructor (Comms queue)",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "ready_for_instructor",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-007",
    title: "DEV — Sent to Instructor",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "sent_to_instructor",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-008",
    title: "DEV — Instructor Has Questions",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "instructor_questions",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-009",
    title: "DEV — Instructor Approved",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "instructor_approved",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
  {
    source_course_id: "DEV-010",
    title: "DEV — Final Approved",
    term: "2026 Spring",
    department: "Dev Testing",
    status: "final_approved",
    assignments: [
      { profile_id: pid.ta, role: "staff" },
      { profile_id: pid.instructor, role: "instructor" },
    ],
  },
];

// ── Upsert courses + assignments ──────────────────────────────────────────────
let created = 0, updated = 0;

for (const course of courses) {
  const { data: existing } = await sb
    .from("courses")
    .select("id")
    .eq("source_course_id", course.source_course_id)
    .maybeSingle();

  let courseId;

  if (existing) {
    const { error } = await sb.from("courses").update({
      title: course.title,
      term: course.term,
      department: course.department,
      status: course.status,
    }).eq("id", existing.id);
    if (error) { console.error(`Update failed ${course.source_course_id}:`, error.message); continue; }
    courseId = existing.id;
    updated++;
  } else {
    const { data, error } = await sb.from("courses").insert({
      source_course_id: course.source_course_id,
      title: course.title,
      term: course.term,
      department: course.department,
      status: course.status,
      created_by: pid.admin,
    }).select("id").single();
    if (error) { console.error(`Insert failed ${course.source_course_id}:`, error.message); continue; }
    courseId = data.id;
    created++;
  }

  // Upsert assignments
  if (course.assignments.length > 0) {
    const rows = course.assignments.map(a => ({
      course_id: courseId,
      profile_id: a.profile_id,
      role: a.role,
      assigned_by: pid.admin,
    }));
    const { error } = await sb.from("course_assignments").upsert(rows, {
      onConflict: "course_id,profile_id,role",
    });
    if (error) console.error(`Assignments failed ${course.source_course_id}:`, error.message);
  }

  console.log(`  ${existing ? "updated" : "created"} [${course.status}] ${course.title}`);
}

console.log(`\nDone. ${created} created, ${updated} updated.`);
console.log(`\nDev accounts (password: CourseBridgeDev123!):`);
for (const [role, email] of Object.entries(DEV_EMAILS)) {
  console.log(`  ${role.padEnd(12)} ${email}`);
}

// ── helpers ───────────────────────────────────────────────────────────────────
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
