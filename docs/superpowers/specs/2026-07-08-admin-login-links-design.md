# Admin-minted login links ("magic links" for any role)

**Date:** 2026-07-08
**Branch:** `ft-admin-login-links`
**Status:** Approved (decisions captured below)

## Problem

Admins want a one-click way to hand an existing user a link that logs them straight
into their own dashboard — no password. Today magic links exist **only** for
instructors (course-scoped `review_invites`). This generalizes the idea to a
*user-scoped* login link for any role.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Which roles can a link log in as | **Any role except `super_admin`** |
| Who can mint links | **`admin_full` and `super_admin`** |
| Target users | **Existing users only** (no on-the-fly account creation) |
| Link lifetime | **Never-expiring, reusable** (revocable; one active link per user) |

## Architecture

Reuses the existing custom-auth primitives (no Supabase Auth):
- Token = 32 random bytes, base64url. Only the **SHA-256 hash** is stored.
- Session minted via `mintSession()` (`lib/auth/service.ts`).
- Post-login routing is already role-aware at `/dashboard` (`ROLE_ROUTES`), so the
  redeem route mints the session and redirects to `/dashboard` — role-agnostic.

### Data model — new table `login_links`

```
id                uuid pk
profile_id        uuid not null -> profiles(id) on delete cascade   -- who the link logs in as
token_hash        text not null unique                             -- sha256(raw token)
created_by        uuid -> profiles(id) on delete set null          -- admin who minted it
created_at        timestamptz not null default now()
revoked_at        timestamptz                                      -- null = active
access_count      integer not null default 0
first_accessed_at timestamptz
last_accessed_at  timestamptz
```
- No `expires_at`: links never expire by decision.
- RLS enabled; admin read policy (`is_admin_role()`); **no** write policy — only the
  service-role server actions write (matches `review_invites`).
- Minting a new link **revokes any prior active link** for that `profile_id`, so at
  most one valid token per user exists (we can't recover a raw token to re-hand it).

### Service — `apps/web/lib/login-links/service.ts`
- `createLoginLink({ profileId, createdBy })` → `{ token }` (revokes prior active, inserts new).
- `redeemLoginLink(rawToken)` → `{ ok, link } | { ok:false, reason }` (not found / revoked).
- `recordLoginLinkAccess(id)` → bumps `access_count`, sets `first/last_accessed_at`.

### Route — `apps/web/app/auth/login-link/[token]/route.ts` (GET)
1. `redeemLoginLink(token)`; on failure redirect `/auth/invite/expired` (reuse existing page).
2. Load target profile. **Refuse if missing or `role === "super_admin"`** (defense in
   depth — role may have changed since minting).
3. `mintSession({ sub, email, fullName })`.
4. `recordLoginLinkAccess`.
5. Redirect `/dashboard`.

### Server actions — added to `apps/web/app/(dashboard)/admin/actions.ts`
Both call `requireAnyRole(context, ["admin_full", "super_admin"])`.
- `generateLoginLinkAction(profileId)` — loads target; rejects if not found or
  `super_admin`; mints link; returns `{ ok, url }` (absolute, via a `buildLoginLink`
  helper mirroring `buildInviteLink`).
- `searchUsersForLoginLinkAction(term)` — `listUsers(1, 50, term)` minus `super_admin`;
  returns `{ id, fullName, email, role }[]` for the admin picker.

## UI

Single surface: a new **"Access Links"** tab on the Admin dashboard, reachable by
`admin_full` and `super_admin` (both are allowed on `/admin`). Not rendered for
`admin_viewer` (read-only).

- `apps/web/components/access/login-link-dialog.tsx` (client) — trigger button + dialog
  that calls `generateLoginLinkAction` and shows the URL with a Copy button.
- `apps/web/app/(dashboard)/admin/_components/login-link-panel.tsx` (client) — user
  search box (→ `searchUsersForLoginLinkAction`) listing matches with the dialog per row.

**Deferred (not in this change):** a per-row button on Super-Admin › Users. That file
(`users-view.tsx`) has unrelated in-progress edits on another branch, so bundling an
edit there would mix concerns. The Admin "Access Links" tab already serves both admin
roles; the Users-page shortcut can be added in a follow-up.

## Security notes
- Raw token never stored; lookup by hash only.
- `super_admin` cannot be a link target (checked at mint **and** at redeem).
- Minting revokes the prior active link → at most one live token per user.
- App-layer `requireAnyRole` is the authorization gate; DB grants execute to
  service-role only.

## Out of scope (YAGNI)
- Expiry / one-time links (explicitly chosen never-expiring).
- On-the-fly user creation (existing users only).
- A revoke-from-UI button (links are revocable in DB; can add later).
- Email delivery of the link (admin copies/pastes it).

## Migration / verification
- Migration file: `db/migrations/20260708000000_login_links.sql`.
- Apply locally via `npm run dev:db:migrate`; run `tsc`/build to typecheck.
