# Local development (Postgres + offline dev auth)

Run the app on your machine against a throwaway local Postgres — no Supabase project
and no Azure Entra needed. This exercises the same `DB_PROVIDER=postgres` data path
that production will use, with a dev-only cookie login.

## One-time: env file

Create `apps/web/.env.local`:

```sh
DB_PROVIDER=postgres
DATABASE_URL=postgres://coursebridge_user:localdev@localhost:5433/coursebridge

# Offline dev auth — the login page's "Dev quick login" buttons set a signed
# session cookie for a seeded profile. NEVER use AUTH_PROVIDER=dev in production
# (it is hard-disabled when NODE_ENV=production).
AUTH_PROVIDER=dev
SESSION_SECRET=local-dev-session-secret-change-me

# Dummy Supabase values so nothing trips on a missing client (not actually used
# under DB_PROVIDER=postgres + AUTH_PROVIDER=dev).
NEXT_PUBLIC_SUPABASE_URL=https://local.invalid
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-dev
SUPABASE_SERVICE_ROLE_KEY=local-dev
```

## Every time

```sh
npm run dev:db:up        # start local Postgres (docker compose, port 5433)
npm run dev:db:migrate   # apply supabase/migrations/* to it
npm run dev:db:seed      # seed dev profiles + 4 sample courses
npm run dev              # start the app
```

Open http://localhost:3000, you'll land on `/auth/login`, and use the **Dev quick
login** buttons (shown because `NODE_ENV` is development and OIDC is off). They sign
you in as the seeded profile for that role:

| Button | Role | Sees |
|---|---|---|
| Staff (TA) | `standard_user` | the 4 sample courses (assigned) |
| Admin / Super Admin | `admin_full` / `super_admin` | admin board, submissions |
| Instructor | `instructor` | the `sent_to_instructor` course |
| Provost | `provost` | org explorer + all-access |

## Resetting

```sh
npm run dev:db:reset     # drop the volume + recreate empty postgres
npm run dev:db:migrate && npm run dev:db:seed
```

## How the auth works

`AUTH_PROVIDER=dev` selects `DevAuthService` (in `apps/web/lib/auth/service.ts`): it
reuses the OIDC signed-cookie session, but "signs in" by looking up the seeded profile
by email (`getProfileByEmail`) and setting the `coursebridge_auth_session` cookie — no
GoTrue, no token exchange. The middleware treats `dev` like `azure-oidc` (cookie check).

## Notes
- The local Postgres role is `coursebridge_user` (the BYPASSRLS app role), so RLS does
  not get in the way — authorization is enforced in app code, same as production.
- Want to test the **Azure OIDC** path instead? Set `AUTH_PROVIDER=azure-oidc` +
  `NEXT_PUBLIC_AUTH_PROVIDER=azure-oidc` + the `AZURE_OIDC_*` vars (needs a real Entra
  app + HTTPS redirect); see `docs/DEPLOY-AZURE.md`.
