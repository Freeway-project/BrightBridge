/**
 * Ensure Auth users + profiles exist for local dev quick-login accounts.
 * Password matches apps/web/app/auth/login/actions.ts (CourseBridgeDev123!).
 *
 * Mode A — Postgres (used when DEV_DATABASE_URL or DATABASE_URL is set):
 *   e.g. after prod mirror; writes auth.users + profiles with elevated DB role.
 *
 * Mode B — Supabase Admin API (when no DB URL):
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/web/.env
 *
 *   npm run dev:users
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEV_PASSWORD = "CourseBridgeDev123!";

/** @type {readonly { email: string; fullName: string; role: string; alsoInstructor?: boolean }[]} */
const ACCOUNTS = [
  { email: "ta@coursebridge.dev", fullName: "Dev TA", role: "standard_user" },
  { email: "admin@coursebridge.dev", fullName: "Dev Admin", role: "admin_full" },
  {
    email: "communications@coursebridge.dev",
    fullName: "Dev Communications",
    role: "admin_viewer",
  },
  { email: "instructor@coursebridge.dev", fullName: "Dev Instructor", role: "instructor" },
  {
    email: "admin-instructor@coursebridge.dev",
    fullName: "Dev Admin Instructor",
    role: "admin_full",
    alsoInstructor: true,
  },
  { email: "superadmin@coursebridge.dev", fullName: "Dev Super Admin", role: "super_admin" },
];

loadEnvFiles([
  ".env.local",
  ".env.development",
  ".env",
  "apps/web/.env.local",
  "apps/web/.env",
  ".env.mirror",
]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl =
  process.env.DEV_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

if (dbUrl) {
  await ensureViaPostgres(dbUrl);
} else if (url && key) {
  await ensureViaSupabaseApi();
} else {
  console.error(
    [
      "Need either:",
      "  • NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or",
      "  • DEV_DATABASE_URL (.env.mirror) or DATABASE_URL",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("\nDone. Dev quick login password:", DEV_PASSWORD);

async function ensureViaSupabaseApi() {
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const a of ACCOUNTS) {
    const email = a.email.toLowerCase();
    let userId = await findUserIdByEmail(admin, email);

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: a.fullName },
      });
      if (error) {
        console.error(`createUser ${email}:`, error.message);
        process.exit(1);
      }
      userId = data.user.id;
      console.log(`created auth  ${email}`);
    } else {
      console.log(`exists auth   ${email}`);
    }

    const row = {
      id: userId,
      email,
      full_name: a.fullName,
      role: a.role,
      also_instructor: a.alsoInstructor ?? false,
    };

    const { error: pErr } = await admin.from("profiles").upsert(row, { onConflict: "id" });
    if (pErr) {
      console.error(`profiles upsert ${email}:`, pErr.message);
      process.exit(1);
    }
    console.log(`profiles ok    ${email} (${a.role}${a.alsoInstructor ? ", also_instructor" : ""})`);
  }
}

async function repairAuthTokenColumns(client) {
  const emails = ACCOUNTS.map((a) => a.email.toLowerCase());
  await client.query(
    `UPDATE auth.users SET
      confirmation_token = COALESCE(confirmation_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token = COALESCE(recovery_token, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      reauthentication_token = COALESCE(reauthentication_token, '')
    WHERE lower(email) = ANY($1::text[])`,
    [emails],
  );
}

async function ensureEmailIdentities(client) {
  const emails = ACCOUNTS.map((a) => a.email.toLowerCase());
  await client.query(
    `INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    SELECT
      u.id::text,
      u.id,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', false,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    FROM auth.users u
    WHERE lower(u.email) = ANY($1::text[])
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
    )`,
    [emails],
  );
}

async function ensureViaPostgres(dbUrl) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    for (const a of ACCOUNTS) {
      const email = a.email.toLowerCase();
      const { rows } = await client.query(
        `SELECT id, email, full_name FROM public.profiles WHERE lower(email) = lower($1)`,
        [email],
      );
      const p = rows[0];
      if (!p) {
        console.error(`skip ${email}: no public.profiles row (create profile or use API mode)`);
        continue;
      }

      const { rows: hit } = await client.query(`SELECT 1 AS x FROM auth.users WHERE id = $1`, [
        p.id,
      ]);
      if (hit.length) {
        // Always reset password to dev password — prod mirror may have overwritten it
        await client.query(
          `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf', 10)), updated_at = now() WHERE id = $2`,
          [DEV_PASSWORD, p.id],
        );
        console.log(`reset pwd     ${email}`);
        continue;
      }

      const metaName = p.full_name || a.fullName;
      await client.query(
        `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, is_sso_user, is_anonymous,
          confirmation_token, email_change, email_change_token_new, recovery_token,
          phone_change, phone_change_token, email_change_token_current, reauthentication_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', $1::uuid,
          'authenticated', 'authenticated', $2,
          crypt($3, gen_salt('bf', 10)),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', $4::text),
          now(), now(), false, false,
          '', '', '', '',
          '', '', '', ''
        )`,
        [p.id, p.email, DEV_PASSWORD, metaName],
      );
      console.log(`created auth  ${email}`);
    }

    await repairAuthTokenColumns(client);
    await ensureEmailIdentities(client);

    for (const a of ACCOUNTS) {
      const email = a.email.toLowerCase();
      await client.query(
        `UPDATE public.profiles
         SET role = $2,
             also_instructor = $3,
             full_name = COALESCE(NULLIF(trim(full_name), ''), $4)
         WHERE lower(email) = lower($1)`,
        [email, a.role, a.alsoInstructor ?? false, a.fullName],
      );
    }
    console.log("profiles roles synced from dev account list");
  } finally {
    await client.end();
  }
}

async function findUserIdByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (!data.users.length || data.users.length < perPage) return null;
    page++;
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
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = val;
    }
  }
}
