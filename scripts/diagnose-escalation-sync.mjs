import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

// Load env vars from .env.mirror
const envFile = new URL("../.env.mirror", import.meta.url).pathname;
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const target = process.argv[2] === "--prod" ? "PROD" : "DEV";
const url = target === "PROD" ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL;

if (!url) {
  console.error(`Missing ${target}_DATABASE_URL in .env.mirror`);
  process.exit(1);
}

console.log(`\nConnecting to ${target} database...\n`);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// 1. Count comparison
const counts = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM public.course_escalations) AS legacy_count,
    (SELECT COUNT(*) FROM public.course_issues WHERE type = 'escalation') AS new_count,
    (SELECT COUNT(*) FROM public.course_escalations e
     WHERE NOT EXISTS (
       SELECT 1 FROM public.course_issues ci WHERE ci.legacy_escalation_id = e.id
     )) AS orphaned_legacy_count;
`);
console.log("=== Escalation Count Comparison ===");
console.table(counts.rows);

// 2. List orphaned escalations if any
const orphaned = await client.query(`
  SELECT e.id, e.title, e.severity, e.status, e.created_at, e.course_id
  FROM public.course_escalations e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.course_issues ci WHERE ci.legacy_escalation_id = e.id
  )
  ORDER BY e.created_at;
`);

if (orphaned.rows.length === 0) {
  console.log("\n✅ No orphaned legacy escalations found — all synced to course_issues.\n");
} else {
  console.log(`\n❌ ${orphaned.rows.length} orphaned escalation(s) NOT in course_issues:\n`);
  console.table(orphaned.rows);
}

// 3. Check for missing comments on migrated escalations
const missingComments = await client.query(`
  SELECT COUNT(*) AS missing_comments
  FROM public.escalation_messages em
  JOIN public.course_issues ci ON ci.legacy_escalation_id = em.escalation_id
  LEFT JOIN public.course_issue_comments cic
    ON cic.issue_id = ci.id AND cic.author_id = em.author_id AND cic.created_at = em.created_at
  WHERE cic.id IS NULL;
`);
console.log("=== Missing Comments (legacy messages not in course_issue_comments) ===");
console.table(missingComments.rows);

await client.end();
