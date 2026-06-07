# Admin → Instructor Email Compose + Emails Tab

**Status:** Draft — pending implementation
**Branch:** `feat/email-notifications`
**Author session:** 2026-06-07

## Problem

Today, an admin sending a course handoff to the instructor uses a one-click button (`SendToInstructorBanner`) that fires a fixed email template. There is no way to:

1. Customize the message (greeting, context, special instructions).
2. See what was previously sent or by whom.
3. Re-send with a different message without changing the template in code.

The underlying passwordless auth (review-invite magic link → Supabase session → `/instructor`) works well and is **not** the bottleneck. The feature gap is purely the admin-side compose UX and an audit trail.

## Goals

- Admin can write a markdown message and a subject, preview the rendered email, and send.
- The instructor dashboard magic link is **always** appended as a styled CTA button so the admin cannot forget it; raw token never appears in the editor.
- Every send is persisted (subject, body, recipient, sender, timestamp, delivery error if any) and visible in a new **Emails** tab on the admin course page.
- The existing magic-link auth flow is unchanged; this feature only changes who writes the body and how we record the send.

## Non-goals (v1)

- Attachments (R2 upload, MIME parts).
- Rich-text WYSIWYG editor, image embeds.
- Saved templates or snippets.
- Inbound email replies routed back into the app.
- Notifying anyone other than the assigned instructor(s) of the course.

## Auth integration — what changes

**Nothing structural.** The existing flow at `apps/web/app/auth/invite/[token]/route.ts:15-60` continues unchanged:

- Each compose-send mints a fresh row in `review_invites` via `createReviewInvite` (`apps/web/lib/invites/service.ts:88-125`): random 32-byte URL-safe token, SHA-256 hashed at rest, 7-day TTL, single-use.
- Creating a new invite for the same `(course_id, email)` auto-revokes prior un-accepted invites (`service.ts:97-103`).
- Redemption route calls `ensureInstructorIdentity` (creates auth user + profile if needed), `auth.verifyMagicLink` to mint a Supabase session, `markInviteAccepted` to consume the token, and `markInstructorViewingByLink` to advance course status. Lands on `/instructor`.

**Implication exposed to admins:** sending invalidates any earlier sign-in link they emailed for the same course+instructor. This is already the behavior today; the dialog will surface it as a one-line note next to the Send button so it isn't a surprise when admins now consciously send multiple messages.

## Data model

One new table:

```sql
create table instructor_emails (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references courses(id) on delete cascade,
  sender_profile_id   uuid not null references profiles(id),
  recipient_email     text not null,
  subject             text not null,
  body_markdown       text not null,
  invite_id           uuid references review_invites(id) on delete set null,
  sent_at             timestamptz not null default now(),
  send_error          text  -- null = delivered (or no-op in dev); non-null = Resend error message
);

create index instructor_emails_course_sent_idx
  on instructor_emails(course_id, sent_at desc);
```

- Access control: app-layer PBAC only (project convention — see `docs/rbac-architecture.md`). No RLS policies. All reads/writes through server actions that call `requireAdminForCourse`.
- `invite_id` is FK-nullable so the row survives if an invite is later hard-deleted; for the v1 schema invites are never deleted, so this is precautionary.
- `send_error` stores the human-readable Resend error so the Emails tab can show it inline.

## Modular file layout

```
apps/web/lib/email/
  client.ts                          # existing — Resend wrapper, unchanged
  markdown.ts                        # NEW — renderMarkdownForEmail(md): { html }
  templates/
    instructor-invite.ts             # existing — fixed-template (kept for fallback)
    instructor-custom.ts             # NEW — wraps admin body + CTA + footer

apps/web/lib/invites/
  service.ts                         # existing — createReviewInvite, etc.
  send.ts                            # existing — issueInstructorInvites (kept; thin wrapper continues to work)
  instructor-identity.ts             # existing — unchanged
  history.ts                         # NEW — list/get persisted instructor_emails

apps/web/lib/admin/
  instructor-email.ts                # NEW — composeInstructorEmailAction (server action module)

apps/web/app/(dashboard)/admin/courses/[id]/
  page.tsx                           # MODIFIED — add "Emails" tab
  _components/
    send-to-instructor-banner.tsx    # MODIFIED — button opens dialog (no behavior change otherwise)
    compose-instructor-email-dialog.tsx   # NEW — modal with subject + markdown editor + preview
    emails-tab.tsx                        # NEW — Emails tab body (history list + "Compose new" button)
    email-history-row.tsx                 # NEW — single past-send row

supabase/migrations/
  <timestamp>_instructor_emails.sql  # NEW — table + index
```

Each module has one responsibility, an explicit interface, and is unit-testable in isolation.

## Module contracts

### `lib/email/markdown.ts`

```ts
export function renderMarkdownForEmail(md: string): { html: string }
```

- Parses with `marked` (commonmark mode, GFM off — minimal surface).
- Sanitizes with `sanitize-html` (server-only). Allowlist:
  - Tags: `p, br, strong, em, u, a, ul, ol, li, blockquote, code, pre, h2, h3`
  - Attrs: `a[href]` only, with `allowedSchemes: ['http', 'https', 'mailto']`
  - No `style`, no event handlers, no `img`, no `iframe`, no `script`.
- Pure function, no I/O. Same implementation used for the actual send and for the server-side preview action — single source of truth.

### `lib/email/templates/instructor-custom.ts`

```ts
export function renderInstructorCustomEmail(input: {
  subject: string
  bodyHtml: string   // already sanitized
  link: string       // magic-link URL
  courseTitle: string
}): { subject: string; html: string; text: string }
```

- Wraps `bodyHtml` in the same card layout as `instructor-invite.ts` (system font, 480px max width, neutral text color).
- **Always** appends the CTA button (`Open my review dashboard` → `link`) and the 12px gray footer ("This link signs you in directly… expires in 7 days.").
- `text` fallback = the markdown source + `\n\n${link}` + footer line.

### `lib/admin/instructor-email.ts`

```ts
'use server'

export type ComposeInput = {
  courseId: string
  subject: string         // 1–200 chars
  bodyMarkdown: string    // 1–10_000 chars
}

export type ComposeResult =
  | { ok: true; sent: number; failed: number; recipients: string[] }
  | { ok: false; reason: 'no_instructor' | 'forbidden' | 'invalid_input'; message?: string }

export async function composeInstructorEmailAction(input: ComposeInput): Promise<ComposeResult>

export async function previewInstructorEmailAction(input: {
  courseId: string        // for PBAC only
  bodyMarkdown: string
}): Promise<{ html: string }>  // wrapped in the same card as the real email, with a stub link
```

`composeInstructorEmailAction` algorithm:

1. PBAC: `requireAdminForCourse(courseId)`. On failure → `{ ok: false, reason: 'forbidden' }`.
2. Validate `input` via Zod (`composeInputSchema`). On failure → `{ ok: false, reason: 'invalid_input', message }`.
3. Load `course` (for title + current status) and recipients via `getCourseInstructorRecipients`. If empty → `{ ok: false, reason: 'no_instructor' }`.
4. Render body once: `renderMarkdownForEmail(bodyMarkdown)`. Reused across all recipients.
5. For each recipient (best-effort, like `issueInstructorInvites`):
   - `createReviewInvite({ courseId, email, createdBy: senderId })` → `{ token, invite }`.
   - `renderInstructorCustomEmail({ subject, bodyHtml, link: buildInviteLink(token), courseTitle })`.
   - `await sendEmail(...)`; capture `sendError` (string) on throw.
   - Insert `instructor_emails` row with `invite_id`, `send_error` (or null).
6. If `course.status` is in the pre-instructor phase, advance to `waiting_on_instructor` via the existing transition helper. If already in instructor phase, no status change (this is a resend).
7. `revalidatePath(\`/admin/courses/${courseId}\`)`.
8. Return `{ ok: true, sent, failed, recipients }`.

`previewInstructorEmailAction` is a thin wrapper: PBAC check, then `renderMarkdownForEmail` and `renderInstructorCustomEmail` with `link: 'https://example.invalid/preview'`. No DB writes, no network. Client uses this to populate the Preview tab so we have one sanitizer (server-side).

### `lib/invites/history.ts`

```ts
export type InstructorEmailRecord = {
  id: string
  courseId: string
  senderProfileId: string
  senderName: string | null
  recipientEmail: string
  subject: string
  bodyMarkdown: string
  sentAt: string
  sendError: string | null
  inviteId: string | null
  inviteRevokedAt: string | null  // joined from review_invites for the badge
  inviteAcceptedAt: string | null
}

export async function listCourseEmails(courseId: string): Promise<InstructorEmailRecord[]>
export async function getLastSentEmail(courseId: string): Promise<InstructorEmailRecord | null>
```

- Admin-only call sites; uses service-role client; ordered by `sent_at desc`.
- Joins `profiles` for `senderName` and `review_invites` for invite lifecycle fields.

## UI

### Emails tab

Added to the existing `StickyTabs` in `apps/web/app/(dashboard)/admin/courses/[id]/page.tsx:51-57`. Order: `Review | Issues | Chat | Timeline | Emails`.

`emails-tab.tsx` (server component):

- Header row: course title sub-heading + **"Compose new"** button (opens `ComposeInstructorEmailDialog`).
- Body: chronological list (newest first) of `EmailHistoryRow` items, each showing:
  - Recipient email + sender name + `sent_at` (relative + tooltip absolute).
  - Subject (bold).
  - Collapsible body (rendered markdown preview).
  - Status badge:
    - `send_error` non-null → red "Delivery failed: …"
    - `invite.accepted_at` non-null → green "Opened"
    - `invite.revoked_at` non-null → gray "Superseded by a newer email"
    - else → amber "Awaiting open"
  - "Resend" button → opens dialog prefilled with that row's subject + body.
- Empty state: "No emails sent yet." + the Compose button repeated.

### Compose dialog

`compose-instructor-email-dialog.tsx` (client component, shadcn `Dialog`):

- Recipient line (read-only): "To: {instructorName} <{email}>" (single instructor in the common case; if multiple, list them).
- **Subject** input (default: `Your course review is ready: {courseTitle}`, or copy from prefilled row).
- Tabbed editor (shadcn `Tabs`):
  - **Write**: `Textarea` (min 8 rows, auto-grow), with a minimal toolbar above it — Bold / Italic / Link / Bullet list / Numbered list. Buttons wrap the current selection with markdown syntax (`**`, `_`, `[text](url)`, `- `, `1. `). No 3rd-party WYSIWYG.
  - **Preview**: `iframe`-isolated render of `previewInstructorEmailAction` output (so email styles don't leak into the dashboard). Includes the auto-appended CTA + footer so admin sees the full final email.
- Helper text near Send: "Sending will invalidate any earlier sign-in link for this instructor."
- **Send** button → calls `composeInstructorEmailAction`. While pending, button disabled + spinner.
- Result toast:
  - `ok: true, failed: 0` → green "Sent to {N} instructor(s)."
  - `ok: true, failed > 0` → amber "Sent to {sent} of {N}. {failed} failed and saved to history."
  - `ok: false, reason: 'no_instructor'` → red "Assign an instructor first."
  - Other failure → red with `message`.

### Banner integration

`send-to-instructor-banner.tsx` and `ResendInviteBanner`: button `onClick` now opens the dialog (prefilled empty for first send; prefilled with the most recent `instructor_emails` row's subject+body for resend). No other props change. The legacy `sendToInstructorAction` / `resendInstructorInviteAction` server actions are kept as-is for now (they may have other call sites or be referenced from email templates / tests) and can be deleted in a follow-up once we confirm nothing else calls them.

## Error handling

| Failure | Behavior |
|---|---|
| Resend API throws for one recipient | Row persisted with `send_error`; other recipients still processed; toast reports counts. |
| Resend API throws for all recipients | Each row persisted with `send_error`; toast: "0 of N sent." Status not advanced. |
| `RESEND_API_KEY` unset (local dev) | `sendEmail` no-ops with a console warn (existing behavior). Row persisted with `send_error: null` so it shows as "Awaiting open" in the history; matches the dev intent of pretending it sent. |
| Markdown contains `<script>` / `onclick` / etc. | Silently stripped by sanitizer. Visible in Preview. |
| Admin without permission tries to send | `requireAdminForCourse` throws → `{ ok: false, reason: 'forbidden' }`; toast surfaces it. |
| No instructor assigned to course | Dialog won't open from banner (banner already guards); from Emails tab, "Compose new" is disabled with a tooltip "Assign an instructor first." |
| Body exceeds 10k chars | Zod rejects → `{ ok: false, reason: 'invalid_input' }`; client also enforces with a char counter. |

## Testing

**Unit (`lib/email/markdown.test.ts`):**
- `**bold**` → `<strong>bold</strong>`.
- `[link](https://x.com)` → `<a href="https://x.com">link</a>`.
- `<script>alert(1)</script>` → stripped.
- `<a href="javascript:alert(1)">x</a>` → href dropped.
- `<img src=x onerror=…>` → tag stripped (not in allowlist).

**Unit (`lib/admin/instructor-email.test.ts`, mocking `sendEmail`, `createReviewInvite`, `requireAdminForCourse`):**
- Happy path: 1 recipient, send resolves → `{ sent: 1, failed: 0 }`, 1 `instructor_emails` insert with `send_error: null`, status advanced.
- Partial failure: 2 recipients, 2nd `sendEmail` throws → `{ sent: 1, failed: 1 }`, 2 rows inserted, 2nd has `send_error` populated, status still advanced.
- No-instructor: recipients empty → `{ ok: false, reason: 'no_instructor' }`, no DB writes, no email calls.
- Forbidden: PBAC throws → `{ ok: false, reason: 'forbidden' }`, no DB writes.
- Invalid input: 11k-char body → `{ ok: false, reason: 'invalid_input' }`, no DB writes.

**Manual E2E:**
1. Admin opens a course with an instructor assigned, switches to Emails tab — sees empty state.
2. Clicks "Compose new", types **bold** + a `[link](https://example.com)`, previews — sees rendered HTML + CTA + footer.
3. Sends. Toast confirms. Emails tab now shows the row with "Awaiting open".
4. Instructor opens email, clicks CTA, lands on `/instructor` authenticated.
5. Admin refreshes Emails tab — row badge flips to "Opened".
6. Admin clicks "Resend" on that row, dialog prefilled, edits subject, sends. New row appears as "Awaiting open"; previous row badge flips to "Superseded by a newer email" (because `createReviewInvite` revoked the prior invite). Old link no longer works (returns to `/auth/invite/expired`).

## Migration / rollout

- One Supabase migration: `instructor_emails` table + index. No data backfill — feature works only for sends from this version onward.
- No env var changes; `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` already wired.
- Behind no feature flag — the banner change is purely UI (opens dialog instead of firing action). The Emails tab is additive.
- New dependencies: `marked` (~30 KB, MIT), `sanitize-html` (~50 KB, MIT). Both server-only. No client bundle impact.

## Open questions

None blocking. Two minor follow-ups for v1.1, not v1:
- Should the Emails tab show emails from related courses (same instructor)? (Probably no — keeps scope tight.)
- Should the system auto-send a reminder N days after "Awaiting open"? (Tracked but out of scope.)
