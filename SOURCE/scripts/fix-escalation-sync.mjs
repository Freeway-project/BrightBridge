import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

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
  console.error(`Missing ${target}_DATABASE_URL`);
  process.exit(1);
}

console.log(`\nConnecting to ${target} database...\n`);
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// Idempotent sync: insert any course_escalations not yet in course_issues
const syncIssues = await client.query(`
  INSERT INTO public.course_issues (
    course_id, phase, type, severity, title, description,
    status, created_by, resolved_by, resolved_at,
    legacy_escalation_id, created_at, updated_at
  )
  SELECT
    e.course_id,
    'migration',
    'escalation',
    e.severity,
    e.title,
    NULL,
    CASE WHEN e.status = 'resolved' THEN 'resolved' ELSE 'open' END,
    e.created_by,
    e.resolved_by,
    e.resolved_at,
    e.id,
    e.created_at,
    e.created_at
  FROM public.course_escalations e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.course_issues ci WHERE ci.legacy_escalation_id = e.id
  )
  RETURNING id, title, created_at;
`);

console.log(`✅ Synced ${syncIssues.rowCount} orphaned escalation(s) to course_issues.`);
if (syncIssues.rowCount > 0) {
  console.table(syncIssues.rows.map(r => ({ id: r.id, title: r.title, created_at: r.created_at })));
}

// Idempotent sync: insert any missing messages
const syncComments = await client.query(`
  INSERT INTO public.course_issue_comments (issue_id, author_id, body, created_at)
  SELECT
    ci.id,
    em.author_id,
    em.body,
    em.created_at
  FROM public.escalation_messages em
  JOIN public.course_issues ci ON ci.legacy_escalation_id = em.escalation_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.course_issue_comments c
    WHERE c.issue_id = ci.id
      AND c.author_id = em.author_id
      AND c.created_at = em.created_at
  )
  RETURNING id;
`);

console.log(`✅ Synced ${syncComments.rowCount} missing comment(s) to course_issue_comments.`);

// Verify final counts
const counts = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM public.course_escalations) AS legacy_count,
    (SELECT COUNT(*) FROM public.course_issues WHERE type = 'escalation') AS new_count,
    (SELECT COUNT(*) FROM public.course_escalations e
     WHERE NOT EXISTS (
       SELECT 1 FROM public.course_issues ci WHERE ci.legacy_escalation_id = e.id
     )) AS remaining_orphans;
`);

console.log("\n=== Final Counts ===");
console.table(counts.rows);

const remaining = parseInt(counts.rows[0].remaining_orphans, 10);
if (remaining === 0) {
  console.log("✅ All escalations are now synced. No orphans remain.\n");
} else {
  console.log(`⚠️  ${remaining} orphan(s) still remain — investigate manually.\n`);
}

await client.end();
