/**
 * seed-demo.mjs
 *
 * One-shot, idempotent demo world for LOCAL experimentation. Builds everything
 * needed to explore the instructor Simple/Full view, the guided wizard, the
 * course switcher, and the dean / dept-head read-only hierarchy drill-in.
 *
 * Safe to re-run. Uses the Supabase Admin API (service role) so it works on a
 * freshly `supabase db reset` database (auth users + profiles created via API).
 *
 * Run from project root (local Supabase must be running):
 *   node scripts/seed-demo.mjs
 *
 * Login password for every account below: CourseBridgeDev123!
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadEnvFiles([".env.local", "apps/web/.env.local", "apps/web/.env", ".env"]);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "http://127.0.0.1:54321";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE?.trim();

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (run `npx supabase status -o env`).");
  process.exit(1);
}

const DEV_PASSWORD = "CourseBridgeDev123!";
const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (m) => process.stdout.write(m + "\n");

const STATUS_ORDER = [
  "course_created", "assigned_to_ta", "ta_review_in_progress", "submitted_to_admin",
  "waiting_on_admin", "staging_in_progress", "ready_for_instructor", "sent_to_instructor",
  "instructor_viewing", "instructor_questions", "instructor_approved", "final_approved",
];
// [actor_role, account key] per destination status
const STEP_ACTOR = {
  assigned_to_ta: ["admin_full", "admin"],
  ta_review_in_progress: ["standard_user", "ta"],
  submitted_to_admin: ["standard_user", "ta"],
  waiting_on_admin: ["admin_full", "admin"],
  staging_in_progress: ["admin_full", "admin"],
  ready_for_instructor: ["admin_full", "admin"],
  sent_to_instructor: ["admin_viewer", "comms"],
  instructor_viewing: ["instructor", "instructor"],
  instructor_questions: ["instructor", "instructor"],
  instructor_approved: ["instructor", "instructor"],
  final_approved: ["admin_full", "admin"],
};

// ── 1. Accounts ───────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { key: "superadmin", email: "superadmin@coursebridge.dev", fullName: "Dev Super Admin", role: "super_admin" },
  { key: "provost", email: "provost@coursebridge.dev", fullName: "Dr. Pat Provost", role: "provost" },
  { key: "admin", email: "admin@coursebridge.dev", fullName: "Dev Admin", role: "admin_full" },
  { key: "ta", email: "ta@coursebridge.dev", fullName: "Dev TA", role: "standard_user" },
  { key: "comms", email: "communications@coursebridge.dev", fullName: "Dev Communications", role: "admin_viewer" },
  { key: "instructor", email: "instructor@coursebridge.dev", fullName: "Dev Instructor", role: "instructor" },
  { key: "adminInstructor", email: "admin-instructor@coursebridge.dev", fullName: "Dev Admin Instructor", role: "admin_full", alsoInstructor: true },
  { key: "dean", email: "dean@coursebridge.dev", fullName: "Dr. Dana Dean", role: "instructor" },
  { key: "associateDean", email: "associate-dean@coursebridge.dev", fullName: "Dr. Alex Associate-Dean", role: "instructor" },
  { key: "depthead", email: "depthead@coursebridge.dev", fullName: "Dr. Priya Dept-Head", role: "instructor" },
];

const pid = {}; // key -> profile/auth uuid

log("=== 1. Accounts ===");
for (const a of ACCOUNTS) {
  const email = a.email.toLowerCase();
  let id = await findUserId(email);
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: a.fullName },
    });
    if (error) { console.error(`createUser ${email}: ${error.message}`); process.exit(1); }
    id = data.user.id;
    log(`  created ${email}`);
  } else {
    log(`  exists  ${email}`);
  }
  pid[a.key] = id;
  const { error: pErr } = await sb.from("profiles").upsert(
    { id, email, full_name: a.fullName, role: a.role, also_instructor: a.alsoInstructor ?? false },
    { onConflict: "id" },
  );
  if (pErr) { console.error(`profile ${email}: ${pErr.message}`); process.exit(1); }
}

// ── 2. Org hierarchy ──────────────────────────────────────────────────────────
log("\n=== 2. Org hierarchy ===");
const college = await ensureUnit("Okanagan College", "college", null);
const school = await ensureUnit("Science & Technology", "school", college);
const csDept = await ensureUnit("Computer Science", "department", school);
const mathDept = await ensureUnit("Mathematics", "department", school);

await ensureMember(pid.dean, college, "dean");           // sees the whole college
await ensureMember(pid.associateDean, school, "associate_dean"); // school-level
await ensureMember(pid.depthead, csDept, "dept_head");   // sees Computer Science
log("  memberships: dean→college, associate_dean→school, dept_head→Computer Science");

// ── 3. Courses (spread across workflow states) ────────────────────────────────
log("\n=== 3. Courses + assignments ===");
const COURSES = [
  { src: "DEMO-CS101", title: "Intro to Computer Science", term: "2026 Spring", unit: csDept, dept: "Computer Science", status: "final_approved" },
  { src: "DEMO-CS201", title: "Data Structures",           term: "2026 Spring", unit: csDept, dept: "Computer Science", status: "instructor_questions" },
  { src: "DEMO-CS301", title: "Algorithms",                term: "2026 Spring", unit: csDept, dept: "Computer Science", status: "sent_to_instructor" },
  { src: "DEMO-CS210", title: "Web Development",           term: "2026 Spring", unit: csDept, dept: "Computer Science", status: "instructor_viewing" },
  { src: "DEMO-CS150", title: "Databases",                 term: "2026 Spring", unit: csDept, dept: "Computer Science", status: "ready_for_instructor" },
  { src: "DEMO-MATH200", title: "Calculus II",             term: "2026 Spring", unit: mathDept, dept: "Mathematics", status: "instructor_approved" },
  { src: "DEMO-MATH150", title: "Linear Algebra",          term: "2026 Spring", unit: mathDept, dept: "Mathematics", status: "ta_review_in_progress" },
];

const courseId = {};
for (const c of COURSES) {
  const { data: existing } = await sb.from("courses").select("id").eq("source_course_id", c.src).maybeSingle();
  let id;
  if (existing) {
    const { error } = await sb.from("courses").update({
      title: c.title, term: c.term, department: c.dept, status: c.status, org_unit_id: c.unit,
    }).eq("id", existing.id);
    if (error) { console.error(`update ${c.src}: ${error.message}`); continue; }
    id = existing.id;
  } else {
    const { data, error } = await sb.from("courses").insert({
      source_course_id: c.src, title: c.title, term: c.term, department: c.dept,
      status: c.status, org_unit_id: c.unit, created_by: pid.admin,
    }).select("id").single();
    if (error) { console.error(`insert ${c.src}: ${error.message}`); continue; }
    id = data.id;
  }
  courseId[c.src] = id;

  // instructor@ as instructor, ta@ as staff
  const { error: aErr } = await sb.from("course_assignments").upsert([
    { course_id: id, profile_id: pid.instructor, role: "instructor", assigned_by: pid.admin },
    { course_id: id, profile_id: pid.ta, role: "staff", assigned_by: pid.admin },
  ], { onConflict: "course_id,profile_id,role" });
  if (aErr) console.error(`assign ${c.src}: ${aErr.message}`);
  log(`  [${c.status}] ${c.title}`);
}

// ── 4. Review content (populate Simple view + wizard) ─────────────────────────
log("\n=== 4. Review content ===");
const { data: sections } = await sb.from("review_sections").select("id, key");
const sectionByKey = Object.fromEntries((sections ?? []).map((s) => [s.key, s.id]));

const RESPONSES = {
  course_metadata: { status: "submitted", data: { term: "2026 Spring", section_numbers: ["01", "02"], migration_notes: "Imported from Moodle; all modules present." } },
  review_matrix: { status: "submitted", data: { items: [{ item_id: "content", status: "pass", notes: "All content migrated." }, { item_id: "links", status: "pass", notes: "Links verified." }, { item_id: "media", status: "attention", notes: "2 videos need re-upload." }] } },
  syllabus_review: { status: "submitted", data: { syllabus_items: [{ item_id: "clarity", ta_status: "pass", notes: "Clear and complete." }, { item_id: "dates", ta_status: "pass", notes: "Term dates updated." }] } },
  gradebook_review: { status: "submitted", data: { categories: [{ name: "Assignments", weight: 40 }, { name: "Midterm", weight: 25 }, { name: "Final", weight: 35 }], notes: "Weights total 100%." } },
  general_notes: { status: "submitted", data: { notes: "Ready for instructor review. Minor media fix pending." } },
};

// Courses that should look "worked on" for the instructor experience
const POPULATED = ["DEMO-CS101", "DEMO-CS201", "DEMO-CS301", "DEMO-CS210", "DEMO-MATH200"];
for (const src of POPULATED) {
  const id = courseId[src];
  if (!id) continue;
  const rows = Object.entries(RESPONSES)
    .filter(([k]) => sectionByKey[k])
    .map(([k, v]) => ({ course_id: id, section_id: sectionByKey[k], responded_by: pid.ta, response_data: v.data, status: v.status }));
  const { error } = await sb.from("review_responses").upsert(rows, { onConflict: "course_id,section_id" });
  if (error) console.error(`responses ${src}: ${error.message}`);
}
log(`  review_responses on ${POPULATED.length} courses`);

// Comments visible to the instructor + an open question issue on the Q&A course
await ensureComment(courseId["DEMO-CS201"], pid.comms, "instructor_visible", "Hi! Please review the migrated gradebook weights and let us know if anything looks off.");
await ensureComment(courseId["DEMO-CS101"], pid.admin, "instructor_visible", "This course is fully approved — thanks for the quick turnaround!");
await ensureIssue(courseId["DEMO-CS201"], pid.instructor, "question", "minor", "Gradebook weight clarification", "Can you confirm the midterm is 25% and not 30%? The old syllabus says 30%.");
await ensureIssue(courseId["DEMO-CS301"], pid.ta, "fix_needed", "major", "Broken module link", "Module 3 'Sorting' links to a 404 in Brightspace.");
log("  comments + issues added");

// Status events — seed a realistic journey up to each course's current status
for (const c of COURSES) {
  await seedTimeline(courseId[c.src], c.status);
}
log("  status-event timelines seeded");

// ── Summary ───────────────────────────────────────────────────────────────────
log("\n=== Done ===");
log(`  Login password: ${DEV_PASSWORD}`);
log("  Explore as:");
log("    instructor@coursebridge.dev  → Simple/Full view, wizard, course switcher (5 instructor-visible courses)");
log("    depthead@coursebridge.dev    → dept-head drill-in (Computer Science: 5 courses, read-only)");
log("    dean@coursebridge.dev        → dean drill-in (whole college: 7 courses, read-only)");
log("    associate-dean@coursebridge.dev → school-level member (per-course read-only access)");
  log("    provost@coursebridge.dev     -> all colleges/courses + org-chart management");
log("    admin@ / ta@ / communications@ / superadmin@  → their normal dashboards");

// ── helpers ────────────────────────────────────────────────────────────────────
async function findUserId(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function ensureUnit(name, type, parentId) {
  const { data: existing } = await sb
    .from("organizational_units")
    .select("id")
    .eq("name", name)
    .eq("type", type)
    .maybeSingle();
  if (existing) {
    if (parentId) await sb.from("organizational_units").update({ parent_id: parentId }).eq("id", existing.id);
    log(`  unit exists  ${type}: ${name}`);
    return existing.id;
  }
  const { data, error } = await sb
    .from("organizational_units")
    .insert({ name, type, parent_id: parentId })
    .select("id")
    .single();
  if (error) { console.error(`unit ${name}: ${error.message}`); process.exit(1); }
  log(`  unit created ${type}: ${name}`);
  return data.id;
}

async function ensureMember(profileId, orgUnitId, title) {
  const { data: existing } = await sb
    .from("org_unit_members")
    .select("id")
    .eq("profile_id", profileId)
    .eq("org_unit_id", orgUnitId)
    .maybeSingle();
  if (existing) {
    await sb.from("org_unit_members").update({ title, is_primary: true }).eq("id", existing.id);
    return;
  }
  const { error } = await sb
    .from("org_unit_members")
    .insert({ profile_id: profileId, org_unit_id: orgUnitId, title, is_primary: true });
  if (error) console.error(`member ${title}: ${error.message}`);
}

async function ensureComment(courseId, authorId, visibility, body) {
  if (!courseId) return;
  const { data } = await sb.from("course_comments").select("id").eq("course_id", courseId).eq("body", body).maybeSingle();
  if (data) return;
  const { error } = await sb.from("course_comments").insert({ course_id: courseId, author_id: authorId, visibility, body });
  if (error) console.error(`comment: ${error.message}`);
}

async function ensureIssue(courseId, createdBy, type, severity, title, description) {
  if (!courseId) return;
  const { data } = await sb.from("course_issues").select("id").eq("course_id", courseId).eq("title", title).maybeSingle();
  if (data) return;
  const { error } = await sb.from("course_issues").insert({
    course_id: courseId, phase: "provision", type, severity, title, description, status: "open", created_by: createdBy,
  });
  if (error) console.error(`issue: ${error.message}`);
}

async function seedTimeline(courseId, currentStatus) {
  if (!courseId) return;
  const target = STATUS_ORDER.indexOf(currentStatus);
  if (target < 0) return;
  for (let i = 1; i <= target; i++) {
    const to = STATUS_ORDER[i];
    const from = STATUS_ORDER[i - 1];
    const step = STEP_ACTOR[to];
    if (!step) continue;
    const [actorRole, actorKey] = step;
    const { data } = await sb.from("course_status_events").select("id").eq("course_id", courseId).eq("to_status", to).maybeSingle();
    if (data) continue;
    const { error } = await sb.from("course_status_events").insert({
      course_id: courseId, from_status: from, to_status: to, actor_id: pid[actorKey], actor_role: actorRole,
    });
    if (error) console.error(`status_event ${to}: ${error.message}`);
  }
}

function loadEnvFiles(files) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
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
