# Cutover runbook: Supabase → self-hosted Postgres + Azure OIDC

The codebase runs on either stack via `DB_PROVIDER` / `AUTH_PROVIDER` (defaults =
Supabase + Supabase-Auth, current behavior). This runbook flips a deployment to
Postgres + Entra OIDC. Nothing here is automatic — execute the steps in order.

> Key invariant: `NEXT_PUBLIC_*` are **baked at build time**. The cutover deploys a
> **freshly built image** configured for the target stack — it is not an env-only restart.

## 0. Prep (no production impact)
1. Stand up the target Postgres. Provision the role + DB:
   `PGHOST=… PGUSER=postgres PGPASSWORD=… APP_DB_PASSWORD=… ./scripts/db-provision.sh`
2. Build the target image with the OIDC build flag:
   `docker build --build-arg NEXT_PUBLIC_AUTH_PROVIDER=azure-oidc --build-arg NEXT_PUBLIC_SUPABASE_URL=… … -t <registry>/brightbridge:<tag> .`
3. Register the Entra app (redirect URI `https://<host>/auth/callback`, app roles:
   `super_admin, provost, admin_full, admin_viewer, standard_user, instructor`).
4. Dry-run the data migration into a scratch DB and validate (steps 2–3 below) — rehearse.

## 1. Freeze writes
Set `NEXT_PUBLIC_FORCE_MAINTENANCE=true` (or your maintenance gate) on the live app so
no new writes land in Supabase during the copy.

## 2. Migrate data (Supabase → target Postgres)
```sh
SUPABASE_DATABASE_URL='postgres://…supabase…' \
TARGET_DATABASE_URL='postgres://coursebridge_user:…@<pg-host>:5432/coursebridge' \
CLEAN_TARGET=true ./scripts/migrate-supabase-to-shared-postgres.sh
```
Then record the migrations as applied **without re-running them** (the data already
carries the schema), and apply the compat fixups:
```sh
DATABASE_URL="$TARGET_DATABASE_URL" MIGRATION_BASELINE_ON_EXISTING=true node scripts/db-migrate-all.mjs
```
This baselines `schema_migrations` and applies `20260528000001_postgres_compat.sql`
(drops the `profiles → auth.users` FK, grants `BYPASSRLS` to `coursebridge_user`).

## 3. Validate
```sh
SUPABASE_DATABASE_URL=… TARGET_DATABASE_URL=… ./scripts/validate-shared-postgres-migration.sh
```
All listed tables (core + issues/comments/mentions/support/reassignments/audit) must match.

## 4. Deploy the target image
Deploy the image built in step 0.2 with these **runtime** secrets:
```
DB_PROVIDER=postgres
DATABASE_URL=<target>
AUTH_PROVIDER=azure-oidc
SESSION_SECRET=<>=16 chars>
APP_BASE_URL=https://<host>
AZURE_OIDC_CLIENT_ID / CLIENT_SECRET / ISSUER / TOKEN_ENDPOINT / AUTHORIZATION_ENDPOINT / REDIRECT_URI
```
The container's entrypoint runs `db-migrate-all.mjs` (idempotent — no-op since baselined),
then serves. See `docs/DEPLOY-AZURE.md`.

## 5. Smoke test
- OIDC login round-trip (redirect → Entra → callback → dashboard).
- Each Entra app-role maps to the right `profiles.role` (incl. **provost**); first login
  auto-provisions a profile.
- Dashboards/issues/support/reassignment/audit/hierarchy/super-admin export all load
  (reads come back full — `BYPASSRLS` works, `auth.uid()` NULL no longer hides rows).
- Notifications + presence update via polling (create an issue → toast within ~15s).

## 6. Lift maintenance
Clear `NEXT_PUBLIC_FORCE_MAINTENANCE`.

## 7. Decommission Supabase (after a soak window)
**Blocked until magic-link invites are app-minted** — today `lib/auth/service.ts`'s
`generateMagicLinkHashedToken`/`verifyMagicLink` and admin user-management still call
Supabase/GoTrue. Re-mint invites as HMAC tokens that set the OIDC cookie first, then:
1. `grep -rn "@supabase" apps/web` → refactor/remove remaining importers.
2. Delete `lib/supabase/*`, `lib/repositories/supabase/*`, the Supabase branch in
   `repositories/index.ts` / `provider.ts`.
3. Remove `@supabase/ssr` + `@supabase/supabase-js` from `apps/web/package.json`;
   `turbo build` must stay green.
4. Delete `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` secrets.
5. Pause/delete the Supabase project **last** (it is the rollback target until then).

## Rollback (before step 7)
Re-deploy the previous Supabase-built image with `DB_PROVIDER`/`AUTH_PROVIDER` unset.
Supabase still holds all data, so rollback is a redeploy. (After step 7 there is no
Supabase to roll back to — keep the soak window generous.)
