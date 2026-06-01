# CourseBridge Non-Production Orchestration (test)

This stack is prepared for Azure OIDC user authentication while keeping Supabase for internal application data access.

## Auth Contract (Azure OIDC)

Populate these values in `.env-coursebridge-test`:

- `APP_BASE_URL`
- `AUTH_PROVIDER` (set to `azure-oidc`)
- `SESSION_SECRET`
- `AZURE_OIDC_TENANT_ID`
- `AZURE_OIDC_CLIENT_ID`
- `AZURE_OIDC_CLIENT_SECRET`
- `AZURE_OIDC_ISSUER`
- `AZURE_OIDC_AUTHORIZATION_ENDPOINT`
- `AZURE_OIDC_TOKEN_ENDPOINT`
- `AZURE_OIDC_JWKS_URI`
- `AZURE_OIDC_REDIRECT_URI`
- `AZURE_OIDC_POST_LOGOUT_REDIRECT_URI`
- `AZURE_OIDC_SCOPES`
- `AZURE_OIDC_ALLOWED_TENANT_ID`

## Internal App Contract (Supabase)

Supabase remains configured for internal app access and service-role operations:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Data Provider Migration Contract

CourseBridge supports a phased data-layer migration with these variables:

- `DB_PROVIDER`
   - `supabase` (current default)
   - `postgres` (target shared-postgres mode)
- `DATABASE_URL`
   - PostgreSQL connection string to shared service, for example:
   - `postgresql://coursebridge_user:<password>@shared-services_postgres-test:5432/coursebridge`

During migration, keep Supabase values populated until application repository implementation is fully switched to direct Postgres.

## Deploy Flow

1. Update `.env-coursebridge-test` with real values.
2. Run from orchestration directory:
   - `./rsync-to-remote.sh api/coursebridge/`
   - `ssh oracle-proxies-non-prod "cd /data && sudo ./deploy.sh redeploy api/coursebridge-test"`

This stack contract is ready for the app-layer auth migration to Azure OIDC.
