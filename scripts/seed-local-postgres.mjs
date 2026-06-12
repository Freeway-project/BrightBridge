// Seeds LOCAL Postgres after a prod restore.
//
// Does NOT create fake data. Instead it unlocks the best real prod accounts
// with Dev1234! so you can explore real courses, real hierarchy, real workflow.
//
// Idempotent — safe to re-run after every restore.
//
// Usage:
//   node scripts/seed-local-postgres.mjs
//   DATABASE_URL=postgresql://... node scripts/seed-local-postgres.mjs

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import process from "node:process";
import pg from "pg";

const scryptAsync = promisify(scrypt);

const DEV_PASSWORD = "Dev1234!";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgres://coursebridge_user:localdev@localhost:5433/coursebridge";

// Real prod accounts to unlock — one per domain, chosen for richest data.
// Password will be set to Dev1234! on the local copy only.
const SHOWCASE_ACCOUNTS = [
  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    email: "ahartwell@okanagan.bc.ca",
    note: "Admin (Amber Hartwell) — admin_full, full course pipeline access",
  },
  {
    email: "mweiss@okanagan.bc.ca",
    note: "Admin (Mike Weiss) — admin_full",
  },
  // ── TA / Staff ─────────────────────────────────────────────────────────────
  {
    email: "gtindogan@okanagan.bc.ca",
    note: "TA (Gian) — 366 course assignments, heaviest reviewer load",
  },
  {
    email: "amccallum@okanagan.bc.ca",
    note: "TA (Alannah McCallum) — 354 assignments",
  },
  // ── Instructor ─────────────────────────────────────────────────────────────
  {
    email: "jheadland@okanagan.bc.ca",
    note: "Instructor (Jill Headland) — 33 courses, all final_approved",
  },
  {
    email: "kclarkson@okanagan.bc.ca",
    note: "Instructor (Kristine Clarkson) — 30 courses",
  },
  // ── Dept Head ──────────────────────────────────────────────────────────────
  {
    email: "afontenla@okanagan.bc.ca",
    note: "Dept Head (Adrian Fontenla) — Business Administration, 54 dept courses visible",
  },
  // ── Associate Dean ─────────────────────────────────────────────────────────
  {
    email: "dmarques@okanagan.bc.ca",
    note: "Associate Dean (Danny Marques) — Trades & Apprenticeship, 75 courses",
  },
  {
    email: "cnewitt@okanagan.bc.ca",
    note: "Associate Dean (Chris Newitt) — Arts & Foundational Programs, 58 courses",
  },
  // ── VP ─────────────────────────────────────────────────────────────────────
  {
    email: "chartigan@okanagan.bc.ca",
    note: "VP (Caitlin Hartigan) — Trades & Apprenticeship, broadest dept view (75 courses)",
  },
];

const client = new pg.Client({ connectionString: databaseUrl });

// How many ready_for_instructor courses to promote to sent_to_instructor per run.
const PROMOTE_LIMIT = 5;

try {
  await client.connect();

  const pwHash = await hashPassword(DEV_PASSWORD);

  // ── 1. Unlock showcase accounts ───────────────────────────────────────────
  let unlocked = 0;
  const missing = [];

  for (const acc of SHOWCASE_ACCOUNTS) {
    const result = await client.query(
      `UPDATE profiles SET password_hash = $1 WHERE email = $2`,
      [pwHash, acc.email],
    );
    if (result.rowCount > 0) {
      unlocked++;
    } else {
      missing.push(acc.email);
    }
  }

  console.log(`\nUnlocked ${unlocked}/${SHOWCASE_ACCOUNTS.length} prod accounts with password: ${DEV_PASSWORD}`);
  if (missing.length > 0) {
    console.log(`  Not found in DB (skip): ${missing.join(", ")}`);
  }

  // ── 2. Promote ready_for_instructor → sent_to_instructor ──────────────────
  // Pick courses that already have a full review (3+ primary sections) and an
  // assigned instructor. Only promotes courses not already promoted (idempotent).
  const { rows: toPromote } = await client.query(`
    SELECT c.id, c.title, p.email AS instructor_email, p.id AS instructor_id
    FROM courses c
    JOIN course_assignments ca ON ca.course_id = c.id AND ca.role = 'instructor'
    JOIN profiles p ON p.id = ca.profile_id
    WHERE c.status = 'ready_for_instructor'
      AND (
        SELECT count(DISTINCT rs.key)
        FROM review_responses rr
        JOIN review_sections rs ON rs.id = rr.section_id
        WHERE rr.course_id = c.id
          AND rs.key IN ('course_metadata','review_matrix','syllabus_review','gradebook_review')
      ) >= 3
      AND NOT EXISTS (
        SELECT 1 FROM course_status_events
        WHERE course_id = c.id AND to_status = 'sent_to_instructor'
          AND note = 'Sent to instructor (dev seed)'
      )
    ORDER BY c.updated_at DESC
    LIMIT $1
  `, [PROMOTE_LIMIT]);

  // Find an admin to act as the sender.
  const { rows: adminRows } = await client.query(`
    SELECT id FROM profiles WHERE role = 'admin_full' LIMIT 1
  `);
  const adminId = adminRows[0]?.id ?? null;

  if (toPromote.length === 0) {
    console.log("\nNo new ready_for_instructor courses to promote — already done or none available.");
  } else if (!adminId) {
    console.log("\nNo admin_full profile found — skipping promotion.");
  } else {
    console.log(`\nPromoting ${toPromote.length} courses to sent_to_instructor:`);
    const seededEmails = new Set();

    for (const row of toPromote) {
      await client.query(
        `UPDATE courses SET status = 'sent_to_instructor', updated_at = now() WHERE id = $1`,
        [row.id],
      );
      await client.query(`
        INSERT INTO course_status_events
          (course_id, from_status, to_status, actor_id, actor_role, note, created_at)
        VALUES ($1, 'ready_for_instructor', 'sent_to_instructor', $2, 'admin_full',
                'Sent to instructor (dev seed)', now())
      `, [row.id, adminId]);

      console.log(`  ✓ ${row.title.slice(0, 60)} → sent_to_instructor  (${row.instructor_email})`);
      seededEmails.add(row.instructor_email);
    }

    // Seed passwords for the promoted courses' instructors.
    let pwUnlocked = 0;
    for (const email of seededEmails) {
      const r = await client.query(
        `UPDATE profiles SET password_hash = $1 WHERE email = $2`,
        [pwHash, email],
      );
      if (r.rowCount > 0) pwUnlocked++;
    }
    console.log(`  Unlocked ${pwUnlocked} instructor account(s) with password: ${DEV_PASSWORD}`);
  }

  // ── 3. Summary ────────────────────────────────────────────────────────────
  console.log("\nAccounts ready to log into:");
  console.log(`${"Email".padEnd(40)} Note`);
  console.log("-".repeat(90));
  for (const acc of SHOWCASE_ACCOUNTS) {
    if (!missing.includes(acc.email)) {
      console.log(`${acc.email.padEnd(40)} ${acc.note}`);
    }
  }
  if (toPromote.length > 0 && adminId) {
    const instructorEmails = [...new Set(toPromote.map((r) => r.instructor_email))];
    console.log("\nPromoted-course instructors (password: Dev1234!):");
    for (const email of instructorEmails) {
      console.log(`  ${email.padEnd(40)} ${toPromote.find((r) => r.instructor_email === email)?.title?.slice(0, 40) ?? ""} …`);
    }
  }

  console.log("\nAll use password: Dev1234!");
  console.log("\nStart the app: npm run dev");
  console.log("  → Use the dev panel on /auth/login to one-click fill credentials");
  console.log("  → Or type the email + Dev1234! directly into the form");
} catch (error) {
  console.error("Seed failed:", error.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end();
}
