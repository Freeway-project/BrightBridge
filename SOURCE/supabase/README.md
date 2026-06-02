# Supabase Schema

This folder contains CourseBridge Supabase database migrations.

The initial schema is based on `docs/data-model.md` and intentionally covers only MVP tables:

- `profiles`
- `courses`
- `course_assignments`
- `course_status_events`
- `review_sections`
- `review_responses`
- `course_comments`
- `review_invites`

## Current Scope

The first migration creates:

- Core tables.
- Role/status check constraints.
- Basic indexes.
- Updated-at trigger helper.
- Seed review sections.
- Row Level Security enabled with no policies yet.

RLS policies are intentionally deferred to the auth/permissions phase. Until policies are added, client-side access through Supabase APIs should be treated as locked down. Server-side code using the service role can still manage data where appropriate.

## Apply Later

Do not apply this blindly to production before reviewing:

```sh
supabase db push
```

or, for a linked project:

```sh
supabase migration up
```

## Deferred

These are intentionally not included yet:

- Storage buckets.
- File metadata.
- PDF export jobs.
- Notification tables.
- Realtime-specific tables.
- Course import batches.
- Advanced audit event taxonomy.
