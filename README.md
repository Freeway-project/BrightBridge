# CourseBridge

CourseBridge is a workflow and collaboration platform for Moodle to Brightspace course migration reviews.

## Purpose

CourseBridge exists to make course migration predictable, auditable, and collaborative.

- It gives teams a shared system for reviewing migrated course content before release.
- It reduces handoff friction between operational staff, reviewers, and decision-makers.
- It creates a permanent record of status changes, comments, decisions, and assignments.

## What The Application Does

At a high level, CourseBridge orchestrates migration review work across role-specific dashboards.

- Tracks each course through a structured lifecycle from intake through approval.
- Assigns work to users with clear ownership and controlled access by role.
- Supports review collaboration through issue tracking, comments, mentions, and notifications.
- Surfaces workload and pipeline visibility for admins and super admins.
- Preserves auditability of transitions, assignments, and key actions.

## Core Functional Areas

### Workflow Management

- Status-driven progression based on allowed transitions.
- Guardrails that ensure only authorized roles can move a course to specific states.
- Consistent lifecycle model shared across dashboard surfaces.

### Review Collaboration

- Course-level comments for context and decision history.
- Issues and follow-up actions tied to specific records.
- Mention-based notifications and presence-aware collaboration endpoints.

### Assignment And Ownership

- Assignment model for staff/instructor workflows.
- Admin and super-admin capability to manage users and role access.
- Separation of responsibilities between execution roles and governance roles.

### Governance And Audit

- Action history for transitions and workflow events.
- Role-based authorization enforced through profile context.
- Architecture that supports centralized identity with Entra app-role alignment.

## Key Features

- Role-aware dashboards (`super_admin`, `admin_full`, `admin_viewer`, `standard_user`, `instructor`).
- Course search and queueing for high-volume review operations.
- Notifications and online presence APIs for active collaboration.
- Migration oversight pages for operational follow-up.
- Secure sign-in with Azure OIDC and cookie-backed session validation.
- Internal profile model for app authorization with optional OIDC role-claim sync.

## Role Functionalities

### super_admin

- Full platform governance and unrestricted access to all dashboard areas.
- Manage users, role assignments, and higher-level organization controls.
- Access super-admin oversight views for system-wide operations.

### admin_full

- Operational administrator role for migration management work.
- Can manage assigned workflows, perform administrative transitions, and coordinate review queues.
- Has broader execution permissions than reviewers, but not full super-admin governance.

### admin_viewer

- Read-focused administrative role for oversight and monitoring.
- Can review progress, statuses, and operational visibility surfaces without full change authority.
- Useful for leadership, stakeholders, or audit-focused access.

### standard_user

- Staff/TA execution role for day-to-day review activities.
- Works assigned course tasks, contributes comments/issues, and advances workflow steps allowed for staff.
- Focused on delivery execution rather than administrative control.

### instructor

- Instructor-facing participant role in course handoff/review stages.
- Engages in instructor-specific review and feedback interactions.
- Access is limited to instructor-relevant surfaces and permitted transitions.

Note: exact actions are enforced by route-level authorization plus workflow transition rules in the application.

## Architecture Snapshot

- Frontend: Next.js App Router (`apps/web`)
- Auth: Azure OIDC session cookie flow (`AUTH_PROVIDER=azure-oidc`)
- Data provider: Postgres (primary in test/non-prod)
- Authorization model: internal `profiles.role` with optional synchronization from OIDC `roles` claim

### Azure OIDC Role Claims

CourseBridge supports custom App Roles defined in the Entra application registration.

- During OIDC callback, the app stores the incoming `roles` claim in the signed session cookie payload.
- On authenticated requests, `getAuthContext()` reads `oidc_roles` and maps claim values into internal roles.
- Supported mapped roles: `super_admin`, `admin_full`, `admin_viewer`, `standard_user` (also accepts `staff`), `instructor`.
- If the mapped claim role differs from the existing `profiles.role`, CourseBridge updates the profile role and uses the mapped role immediately.

This keeps role assignment centralized in Entra App Role assignments while preserving internal profile-based authorization.

## Branding

- Shared OC loading logo asset: `apps/web/public/OCLoadingLogo.gif`
- Shared logo component: `apps/web/components/shared/oc-loading-logo.tsx`
- Sidebar and login branding both consume this component.

## Project Layout

- `apps/web` - Next.js App Router web app
- `packages/workflow` - workflow roles, statuses, and transitions
- `packages/auth` - authentication helpers and permission boundaries
- `packages/validation` - shared schemas and validation logic
- `packages/storage` - file storage abstractions and metadata helpers
- `packages/ui` - shared UI components
- `packages/config` - shared TypeScript and tooling configuration
- `docs` - product, stack, and workflow notes

## Development

Install dependencies:

```sh
npm install
```

Run the web app:

```sh
npm run dev
```

The web app lives at `apps/web`.

### Authentication Flow (Azure OIDC)

1. Login button redirects to `apps/web/app/auth/oidc/login/route.ts`.
2. Azure redirects back to `apps/web/app/auth/callback/route.ts` with `code` and `state`.
3. `apps/web/lib/auth/service.ts` exchanges code for `id_token`, validates issuer/audience/nonce, and creates signed `coursebridge_auth_session` cookie.
4. `apps/web/lib/auth/context.ts` resolves session user + profile and enforces app role access.

## Database Provisioning

CourseBridge now includes source-controlled provisioning assets for dedicated Postgres database setup:

- Shell wrapper: `scripts/db-provision.sh`
- SQL script: `scripts/sql/provision-coursebridge.sql`

The script is idempotent and creates/updates the application role and creates the application database if it does not exist.

Example:

```sh
PGHOST=shared-services_postgres-test \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD='***' \
APP_DB_NAME=coursebridge \
APP_DB_USER=coursebridge_user \
APP_DB_PASSWORD='***' \
./scripts/db-provision.sh
```

