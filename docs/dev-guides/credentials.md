# CourseBridge Developer Guide: Credentials & Access Management

Welcome to the CourseBridge Credentials and Access Management Guide. This document provides a reference sheet of system credentials, keys, environment files, access request protocols, and the role permission matrix.

---

## 1. Environment Configurations

CourseBridge maintains three distinct environments: Local Dev, Dev Mirror (testing remote integration), and Production.

### Environment Configuration Files
*   **Local Dev Environment**: Configured via [`.env.local`](file:///mnt/data/projects/BrightBridge/.env.local) at the repository root and `apps/web/.env.local` for Next.js runtime.
*   **Dev Mirror Environment**: Configured via [`.env.mirror`](file:///mnt/data/projects/BrightBridge/.env.mirror) for running migrations and backups on local instances mapped to dev servers.
*   **Production Environment**: Configured via [`.env.prod`](file:///mnt/data/projects/BrightBridge/.env.prod) at the repository root and standard environment secret managers on Vercel deployment servers.

---

## 2. Keys, Secrets, and Connections

Below is the database and API configurations across environments. To prevent leaks, all production and live staging secret credentials must be obtained from `.env.local` or `.env.prod` on deployment environments.

### Database Connection Strings
*   **Local Docker Database**:
    *   `DEV_DATABASE_URL`: `postgresql://coursebridge_user:localdev@localhost:5433/coursebridge`
*   **Dev Supabase Database (Session Pooler - Port 5432)**:
    *   `DEV_DATABASE_URL`: `postgresql://postgres.usijcptcubkddpkgervf:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres` (Obtain PASSWORD from Dev Lead)
*   **Production Database (Session Pooler - Port 5432 / Backup pg_dump target)**:
    *   `PROD_DATABASE_URL` (Backup / Migrate target): `postgresql://postgres.zgqepddmqgtoeczwoetx:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres` (Obtain PASSWORD from Dev Lead)
*   **Production Database (Transaction Pooler - Port 6543 / Vercel runtime target)**:
    *   `DATABASE_URL` (Serverless runtime): `postgres://postgres.ytmscglilbkmrlstvjhy:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x`
    *   *Default max poolers*: `PG_POOL_MAX=50`

### Supabase Keys
*   **URL**: `https://ytmscglilbkmrlstvjhy.supabase.co`
*   **Anon Key / Publishable Key**:
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: (See `.env.prod` for active key)
*   **Service Role Secret Key**:
    *   `SUPABASE_SERVICE_ROLE_KEY`: (See `.env.prod` for active key)

### App Security Secrets
*   **Session Encryption**:
    *   `SESSION_SECRET`: (Generate unique 32-byte base64 string locally; see Vercel/`.env.prod` for production)
*   **Server Actions Encryption**:
    *   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: (Generate unique 32-byte base64 string locally; see Vercel/`.env.prod` for production)

### Integrations and Services API Keys
*   **Sentry Monitoring**:
    *   `NEXT_PUBLIC_SENTRY_DSN`: (See `.env.prod` for active DSN URL)
    *   `SENTRY_AUTH_TOKEN`: (Configured on CI/CD build environments; see DevOps Lead)
*   **AI Analytics APIs**:
    *   `ANTHROPIC_API_KEY`: (Powers natural language SQL translation for Provost; see DevOps Lead)
    *   `GROQ_API_KEY`: (Alternative LLM reasoning fallback; see DevOps Lead)
*   **Instructor Default Password**:
    *   `INSTRUCTOR_DEFAULT_PASSWORD`: (See `.env.local` for default local seed password)

---

## 3. Contact Matrix & Access Request Protocol

Access to keys, repositories, databases, and third-party SaaS environments is restricted. Developers must contact the relevant system administrators to request permissions.

### Systems Administrators Contact Directory

| Platform / Service | System Owner Team | Primary Contact Email | Required Form / Action |
| --- | --- | --- | --- |
| **Supabase Database Project** | Database Admin Lead | `dbadmin@okanagan.bc.ca` | Request DB invite to project ref `ytmscglilbkmrlstvjhy` |
| **Vercel Deployments** | Web Operations Lead | `webops@okanagan.bc.ca` | Request developer access to the Vercel Workspace and project `bright-bridge` |
| **Cloudflare R2 Storage** | Infrastructure Team | `infra@okanagan.bc.ca` | Request read/write IAM API key generation for R2 bucket |
| **Sentry Project Organization** | DevOps Lead | `devops-leads@okanagan.bc.ca` | Ask for invitation to Organization `harsh-ic` and Project `bright-bridge` |
| **Google Drive Backup Folder** | G-Suite Admin Team | `gsuite@okanagan.bc.ca` | Ask to share folder `coursebridge-backups` with write credentials |

### Current Authentication & Email Models
*   **Authentication Model**: Authentication is handled via secure Magic Links (OTP) sent to users' emails, standard password-based login for local developers/admins, and a dev role switcher card (`ENABLE_DEV_LOGIN` dev bypass) enabled in non-production environments.
*   **Email Model**: Microsoft Graph is configured as the primary transactional email provider (to send OTP magic links and system updates). Resend serves as a dormant fallback email channel. In local development environments, outgoing mail delivery defaults to `noop` (logged to local terminal console instead of sent).

### Access Request Step-by-Step
1.  **Code Repository**: Access is granted via GitHub repository team invitation. Ensure your GitHub handle is shared with the Dev Lead.
2.  **Local Database Setup**: Run `npm run dev:setup` to spin up a local PostgreSQL Docker container. This automatically provisions the database and seeds local admin accounts (no permission ticket required).
3.  **Third-Party API Access**: Sentry, Anthropic, and Groq keys must be requested through `devops-leads@okanagan.bc.ca`. Developers should never use personal accounts for integration testing.

---


## 4. Role Permissions Matrix

The following matrix documents actions allowed across the different role layers.

| Action | Super Admin | Provost | Admin Full | Admin Viewer | TA (Standard User) | Instructor |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Read Course Queues** | Yes | Yes | Yes | Yes | Assigned Only | Assigned Only |
| **Create Course Records** | Yes | No | Yes | No | No | No |
| **Assign TAs to Courses** | Yes | No | Yes | No | No | No |
| **Update Global Settings** | Yes | No | No | No | No | No |
| **Complete Checklist Forms** | Yes | No | Yes | No | Assigned Only | No |
| **Request Changes (Fixes)** | Yes | No | Yes | No | No | No |
| **Mark Staging Complete** | Yes | No | Yes | No | Assigned Only | No |
| **Send Invites to Instructors** | Yes | No | Yes | Yes | No | No |
| **Ask Reviewer Chat Questions**| Yes | No | Yes | No | Assigned Only | Assigned Only |
| **Approve / Sign-off Course** | Yes | No | Yes | No | No | Assigned Only |
| **Final Sign-off / Live Push** | Yes | No | Yes | No | No | No |
| **Read Sentry / DB Logs** | Yes | No | No | No | No | No |
| **Run Provost AI Assistant** | Yes | Yes | No | No | No | No |
