# Local Test Setup on VPS — Delegation Demo

Standalone runbook for spinning up the **Supabase lineage** of CourseBridge on a
VPS so you can exercise the "act on behalf of" delegation feature without
touching prod.

This is the `main` lineage (Supabase client + auth). The `ft-azure-main-sync`
branch's `vps-stack/` is a different lineage (bundled Postgres + Azure OIDC) —
**don't mix them**.

## Prereqs on the VPS

- Docker + Docker Compose
- Supabase CLI (`npm i -g supabase` or the standalone binary)
- Node 22

## 1. Clone + branch

```bash
git clone https://github.com/Freeway-project/BrightBridge.git
cd BrightBridge
git checkout ft-local-test-delegation
npm install
```

## 2. Start local Supabase stack

```bash
supabase start            # prints API URL + anon + service_role keys — save them
supabase db reset         # applies ALL migrations incl. 20260611..._delegated_on_behalf_of
```

`supabase start` binds to `localhost` by default. If the browser will reach this
VPS over a public IP, either SSH-tunnel `54321` / `54323`, or expose them via your
reverse proxy. The browser must be able to hit `NEXT_PUBLIC_SUPABASE_URL`
directly — anon/auth calls run client-side.

## 3. Configure the app

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://<vps-host-or-ip>:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from `supabase start`>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase start`>
```

`NEXT_PUBLIC_*` are baked at build time — set this **before** `npm run build`.

## 4. Run the app

```bash
npm run build && npm start          # production-like
# or
npm run dev                          # iterative
```

## 5. Seed the demo

1. Open Studio (`http://<vps-host>:54323`) → **Authentication → Add user** ×3:
   - `dean.test@coursebridge.test`
   - `instructor.test@coursebridge.test`
   - `ta.test@coursebridge.test`
   (any passwords; no email verification locally)

2. Run the seed (looks users up by email, no IDs to paste):

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f scripts/sql/delegation-demo.sql
```

## 6. Drive the demo

- Log in as `dean.test` → `/instructor` → **[ZZTEST] Delegation Demo Course** appears under "Your department"
- Open it → "Acting as Associate Dean on behalf of Instructor Test"
- Approve / ask / comment
- Log in as `ta.test` → see the dean's identity + on-behalf line in the thread + timeline

## Teardown

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f scripts/sql/delegation-demo-teardown.sql
```

Then delete the 3 auth users in Studio. Or wipe everything:

```bash
supabase db reset      # blank slate + re-applies migrations
```
