#!/usr/bin/env node
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const { rows: courses } = await pool.query(`select id from public.courses`);
  console.log(`Backfilling ${courses.length} course channels...`);
  for (const { id } of courses) {
    await pool.query(
      `select 1 from public.conversations where type='course' and course_id=$1`,
      [id],
    );
    const { rows: convRows } = await pool.query(
      `insert into public.conversations (type, title, course_id)
       values ('course', (select '# ' || title from public.courses where id=$1), $1)
       on conflict on constraint conversations_course_unique do nothing
       returning id`,
      [id],
    );
    const convId =
      convRows[0]?.id ??
      (await pool.query(
        `select id from public.conversations where type='course' and course_id=$1`,
        [id],
      )).rows[0].id;
    const { rows: assignees } = await pool.query(
      `select distinct user_id from public.course_assignments where course_id=$1`,
      [id],
    );
    for (const { user_id } of assignees) {
      await pool.query(
        `insert into public.conversation_members (conversation_id, user_id)
         values ($1, $2) on conflict do nothing`,
        [convId, user_id],
      );
    }
  }
  const { rows: roles } = await pool.query(
    `select distinct role from public.profiles where role is not null`,
  );
  console.log(`Backfilling ${roles.length} role channels...`);
  for (const { role } of roles) {
    const { rows: convRows } = await pool.query(
      `insert into public.conversations (type, title, role_key)
       values ('role', $2, $1)
       on conflict on constraint conversations_role_unique do nothing
       returning id`,
      [role, `# ${role.replace(/_/g, "-")}`],
    );
    const convId =
      convRows[0]?.id ??
      (await pool.query(
        `select id from public.conversations where type='role' and role_key=$1`,
        [role],
      )).rows[0].id;
    const { rows: holders } = await pool.query(
      `select id from public.profiles where role=$1`,
      [role],
    );
    for (const { id: userId } of holders) {
      await pool.query(
        `insert into public.conversation_members (conversation_id, user_id)
         values ($1, $2) on conflict do nothing`,
        [convId, userId],
      );
    }
  }
  console.log("Backfill complete.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
