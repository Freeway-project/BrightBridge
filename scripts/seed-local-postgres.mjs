// Seeds a LOCAL Postgres (DB_PROVIDER=postgres path) with the dev accounts from
// apps/web/app/auth/login/dev-accounts.ts plus a few sample courses, so `npm run
// dev` with AUTH_PROVIDER=dev has something to log into. Idempotent.
//
// Writes profile/course rows directly via pg — no auth schema needed
// (the postgres_compat migration drops the auth.users FK).

import { createHash } from "node:crypto";
import process from "node:process";
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://coursebridge_user:localdev@localhost:5433/coursebridge";

// email -> internal profiles.role
const DEV_PROFILES = [
  { email: "ta@coursebridge.dev", name: "Dev Staff (TA)", role: "standard_user" },
  { email: "admin@coursebridge.dev", name: "Dev Admin", role: "admin_full" },
  { email: "communications@coursebridge.dev", name: "Dev Comms", role: "admin_viewer" },
  { email: "instructor@coursebridge.dev", name: "Dev Instructor", role: "instructor" },
  { email: "admin-instructor@coursebridge.dev", name: "Dev Admin+Instructor", role: "admin_full" },
  { email: "superadmin@coursebridge.dev", name: "Dev Super Admin", role: "super_admin" },
  { email: "provost@coursebridge.dev", name: "Dev Provost", role: "provost" },
  { email: "dean@coursebridge.dev", name: "Dev Dean", role: "admin_viewer" },
  { email: "associate-dean@coursebridge.dev", name: "Dev Associate Dean", role: "admin_viewer" },
  { email: "depthead@coursebridge.dev", name: "Dev Dept Head", role: "admin_viewer" },
];

const SAMPLE_COURSES = [
  { code: "DEV-001", title: "BIOL 112 — Intro Biology", status: "assigned_to_ta" },
  { code: "DEV-002", title: "MATH 100 — Calculus I", status: "ta_review_in_progress" },
  { code: "DEV-003", title: "ENGL 110 — Composition", status: "submitted_to_admin" },
  { code: "DEV-004", title: "CHEM 121 — Intro Chemistry", status: "sent_to_instructor" },
];

// Stable UUID per email so re-seeding upserts instead of duplicating.
function emailToUuid(email) {
  const h = createHash("sha256").update(email).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  for (const p of DEV_PROFILES) {
    await client.query(
      `
        INSERT INTO profiles (id, email, full_name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role
      `,
      [emailToUuid(p.email), p.email, p.name, p.role],
    );
  }
  console.log(`Seeded ${DEV_PROFILES.length} dev profiles.`);

  const superId = emailToUuid("superadmin@coursebridge.dev");
  const taId = emailToUuid("ta@coursebridge.dev");
  const instructorId = emailToUuid("instructor@coursebridge.dev");

  for (const c of SAMPLE_COURSES) {
    const existing = await client.query(`SELECT id FROM courses WHERE source_course_id = $1 LIMIT 1`, [c.code]);
    let courseId = existing.rows[0]?.id;

    if (!courseId) {
      const inserted = await client.query(
        `
          INSERT INTO courses (source_course_id, title, status, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `,
        [c.code, c.title, c.status, superId],
      );
      courseId = inserted.rows[0].id;
    }

    await client.query(
      `
        INSERT INTO course_assignments (course_id, profile_id, role, assigned_by)
        VALUES ($1, $2, 'staff', $3)
        ON CONFLICT (course_id, profile_id, role) DO NOTHING
      `,
      [courseId, taId, superId],
    );
    await client.query(
      `
        INSERT INTO course_assignments (course_id, profile_id, role, assigned_by)
        VALUES ($1, $2, 'instructor', $3)
        ON CONFLICT (course_id, profile_id, role) DO NOTHING
      `,
      [courseId, instructorId, superId],
    );
  }
  console.log(`Seeded ${SAMPLE_COURSES.length} sample courses (assigned to ta@ + instructor@).`);
  console.log("Done. Log in via the dev quick-login buttons on /auth/login.");
} catch (error) {
  console.error("Seed failed:", error.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end();
}
