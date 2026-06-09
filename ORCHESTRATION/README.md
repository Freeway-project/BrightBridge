# CourseBridge Non-Production Orchestration (test)

This stack runs CourseBridge with Azure OIDC user authentication and a shared Postgres backend.

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

## Data Layer (Postgres)

CourseBridge connects directly to a shared Postgres instance:

- `DB_PROVIDER=postgres`
- `DATABASE_URL`
   - PostgreSQL connection string to shared service, for example:
   - `postgresql://coursebridge_user:<password>@shared-services_postgres-test:5432/coursebridge`

## Deploy Flow

1. Update `.env-coursebridge-test` with real values.
2. Run from orchestration directory:
   - `./rsync-to-remote.sh api/coursebridge/`
   - `ssh oracle-proxies-non-prod "cd /data && sudo ./deploy.sh redeploy api/coursebridge-test"`
