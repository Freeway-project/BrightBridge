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

try {
  await client.connect();

  const pwHash = await hashPassword(DEV_PASSWORD);

  let unlocked = 0;
  let missing = [];

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

  console.log("\nAccounts ready to log into:");
  console.log(`${"Email".padEnd(40)} Note`);
  console.log("-".repeat(90));
  for (const acc of SHOWCASE_ACCOUNTS) {
    if (!missing.includes(acc.email)) {
      console.log(`${acc.email.padEnd(40)} ${acc.note}`);
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
