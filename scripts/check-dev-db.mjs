import { readFileSync, existsSync } from 'node:fs';
import pg from 'pg';

function loadEnv(files) {
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv(['.env.mirror', 'apps/web/.env.local', 'apps/web/.env']);

const url = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DEV_DATABASE_URL'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const tables = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
);

const checks = await client.query(`
  SELECT
    to_regclass('public.profiles')                    as profiles,
    to_regclass('public.courses')                     as courses,
    to_regclass('public.course_assignments')          as course_assignments,
    to_regclass('public.review_sections')             as review_sections,
    to_regclass('public.review_responses')            as review_responses,
    to_regclass('public.organizational_units')        as org_units,
    to_regclass('public.org_unit_members')            as org_unit_members,
    to_regclass('public.org_unit_hierarchy_paths')    as org_unit_hierarchy_paths,
    to_regclass('public.course_escalations')          as course_escalations,
    (SELECT count(*)::int FROM public.review_sections) as review_sections_count
`);

const cols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
  ORDER BY ordinal_position
`);

const profileConstraints = await client.query(`
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
  ORDER BY conname
`);

const funcs = await client.query(`
  SELECT proname FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  ORDER BY proname
`);

const grants = await client.query(`
  SELECT
    has_table_privilege('service_role', 'public.profiles', 'INSERT') as profiles_insert,
    has_table_privilege('service_role', 'public.courses', 'SELECT') as courses_select,
    has_table_privilege('service_role', 'public.course_escalations', 'INSERT') as escalations_insert
`);

// Check also_instructor column exists
const alsoInstructor = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles'
    AND column_name IN ('is_instructor','also_instructor')
`);

// Check org_unit_id on courses
const orgUnitOnCourses = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='courses' AND column_name='org_unit_id'
`);

// Check monitoring schema
const monitoringSchema = await client.query(`
  SELECT schema_name FROM information_schema.schemata WHERE schema_name='monitoring'
`);

console.log('\n=== PUBLIC TABLES ===');
console.log(tables.rows.map(r => r.tablename).join(', '));

console.log('\n=== KEY OBJECTS (from migrations) ===');
const c = checks.rows[0];
for (const [k, v] of Object.entries(c)) {
  const ok = v !== null && v !== '0';
  console.log(`  ${ok ? '✓' : '✗'} ${k}: ${v ?? 'MISSING'}`);
}

console.log('\n=== profiles COLUMNS ===');
console.log(cols.rows.map(r => r.column_name).join(', '));

console.log('\n=== profiles CONSTRAINTS ===');
console.log(profileConstraints.rows.map(r => r.conname).join(', '));

console.log('\n=== PUBLIC FUNCTIONS ===');
console.log(funcs.rows.map(r => r.proname).join(', '));

console.log('\n=== SERVICE_ROLE GRANTS ===');
console.log(grants.rows[0]);

console.log('\n=== MIGRATION-SPECIFIC CHECKS ===');
const aicol = alsoInstructor.rows.map(r => r.column_name);
console.log(`  also_instructor: ${aicol.includes('also_instructor') ? '✓ present' : '✗ MISSING'}`);
console.log(`  is_instructor (old): ${aicol.includes('is_instructor') ? '⚠ still exists' : '✓ gone'}`);
console.log(`  courses.org_unit_id: ${orgUnitOnCourses.rows.length ? '✓ present' : '✗ MISSING'}`);
console.log(`  monitoring schema: ${monitoringSchema.rows.length ? '✓ present' : '✗ MISSING'}`);

await client.end();
