# Provost Analytics Assistant — Design

**Date:** 2026-06-22
**Status:** Proposed
**Audience:** Provost, `admin_full`, `super_admin` in phase 1

## Goal

Add a general-purpose AI assistant that can answer open-ended leadership questions
 about migration progress, bottlenecks, workload, and recent activity across the
 institution.

This is **not** a support bot, a fixed FAQ flow, or a free-form SQL interface.
The assistant should feel broad from the user's perspective, but its data access
 must be tightly controlled.

## Product shape

Example questions:

- "What is blocking approvals right now?"
- "Which units have the most stalled courses?"
- "Show me courses stuck more than 10 days."
- "Summarize what changed this week."
- "Where are instructors waiting the longest?"
- "Compare this month to last month."

The assistant should answer these in natural language, optionally with short
tables, counts, and suggested follow-up questions.

## Non-goals

- No direct Supabase MCP exposure to end users.
- No browser-side database credentials beyond the normal app session.
- No `service_role` in client code.
- No arbitrary SQL generation against production in phase 1.
- No write actions, workflow transitions, or mutating admin operations.
- No blending with person-to-person course chat; this is a separate product
  surface.

## Existing app context

- The app already has institution-wide dashboard data via
  `getSuperAdminData()` in `apps/web/lib/super-admin/queries.ts`.
- The app already uses server-side auth checks in Next.js route handlers via
  `getAuthContext()` / `requireProfile()`.
- The current RBAC model is application-layer PBAC, documented in
  `docs/rbac-architecture.md`.
- Provost already has an executive dashboard design with status counts, stuck
  courses, audit events, units, and members.

This means the assistant should reuse the existing backend patterns and role
 model instead of inventing a separate access strategy.

## Trust boundary

The core rule:

`User question -> Next.js server route -> assistant tool layer -> read-only analytics queries -> LLM answer`

The LLM must never directly:

- connect to Supabase MCP,
- receive database credentials,
- query raw production tables from the browser,
- or execute arbitrary SQL from user input.

The server owns all tool execution and enforces auth, scoping, limits, and logs.

## Phase 1 user scope

Allowed roles:

- `provost`
- `admin_full`
- `super_admin`

Deferred:

- `admin_viewer`: likely yes later, but only after answer quality and data
  scoping are validated.
- `standard_user`
- `instructor`

Phase 1 is intentionally leadership-only because the assistant will summarize
institution-wide operational data.

## UI surface

Phase 1 recommendation:

- Add a dedicated page: `/assistant`
- Show it in nav only for `provost`, `admin_full`, `super_admin`
- Reuse the visual patterns from the existing chat UI where helpful, but do not
  place the assistant inside the peer messaging product

Reasoning:

- Clear separation between human conversation and AI analytics
- Easier permission gating
- Easier logging and rollout
- Avoids confusing "message another person" with "ask the system"

Phase 1 page sections:

1. Conversation pane
2. Suggested prompts
3. Optional result cards or mini-tables
4. "Data used" footer with timestamp and tool names

## Data access strategy

Use a semantic analytics layer, not raw table access.

Two acceptable implementation shapes:

1. Repository-backed server tools over existing tables
2. Curated Postgres views / RPCs exposed only to the server

Recommendation:

- Start with repository-backed server tools for speed, reusing existing query
  code where possible
- Add views/RPCs where repeated logic becomes complex or performance-sensitive

## Semantic domains

Phase 1 tools should cover these domains:

1. Course status and throughput
2. Bottlenecks / stuck work
3. Organizational unit comparisons
4. Instructor waiting / approval lag
5. Recent activity / audit summary
6. Staff workload distribution

## Proposed read models

These can be implemented as repository queries first, then lifted into SQL views
or RPCs if needed.

### `course_status_facts`

One row per course with the fields needed for operational analytics:

- `course_id`
- `course_title`
- `term`
- `org_unit_id`
- `org_unit_name`
- `status`
- `primary_phase`
- `created_at`
- `updated_at`
- `days_in_current_status`
- `assigned_staff_count`
- `instructor_assigned`
- `last_status_change_at`

### `workflow_bottlenecks`

Derived operational facts about lag:

- `course_id`
- `status`
- `days_stuck`
- `ball_in_court`
- `blocking_role`
- `org_unit_id`
- `org_unit_name`
- `last_actor_role`
- `last_actor_name`
- `last_activity_at`

### `unit_progress_facts`

Per-unit rollup:

- `org_unit_id`
- `org_unit_name`
- `total_courses`
- `completed_courses`
- `in_progress_courses`
- `stuck_courses`
- `instructor_waiting_courses`
- `median_days_open`
- `updated_at`

### `recent_activity_facts`

Audit/event oriented feed:

- `event_id`
- `course_id`
- `course_title`
- `actor_id`
- `actor_name`
- `actor_role`
- `from_status`
- `to_status`
- `note`
- `created_at`
- `org_unit_id`
- `org_unit_name`

### `staff_workload_facts`

Per-worker staffing and queue shape:

- `profile_id`
- `full_name`
- `role`
- `org_unit_id`
- `org_unit_name`
- `active_course_count`
- `stuck_course_count`
- `submitted_waiting_count`
- `last_activity_at`

## Tool contract

The assistant should have a small, typed tool surface. The LLM can call these
in combinations, but only these.

### `get_overview_metrics`

Purpose:
Return top-level counts for a scope and date range.

Inputs:

- `date_range`: `last_7_days | last_30_days | this_month | last_month | all_time`
- `org_unit_id?`
- `term?`

Outputs:

- total courses
- completed count
- in-progress count
- stuck count
- instructor-waiting count
- completion rate

### `list_stuck_courses`

Purpose:
Return the most at-risk courses.

Inputs:

- `min_days_stuck`
- `limit` with hard cap `50`
- `org_unit_id?`
- `status?`
- `term?`

Outputs:

- course title
- status
- days stuck
- org unit
- last activity

### `compare_units`

Purpose:
Rank organizational units by a chosen metric.

Inputs:

- `metric`: `total_courses | completion_rate | stuck_courses | instructor_waiting_courses | median_days_open`
- `limit` with hard cap `25`
- `term?`

Outputs:

- ordered unit rows
- metric value
- institution average for comparison

### `summarize_recent_activity`

Purpose:
Summarize recent workflow movement.

Inputs:

- `date_range`
- `org_unit_id?`
- `limit` with hard cap `100`

Outputs:

- counts by transition
- notable actors
- notable courses
- recent event rows

### `get_bottleneck_breakdown`

Purpose:
Explain where work is slowing down.

Inputs:

- `group_by`: `status | phase | org_unit | blocking_role`
- `date_range`
- `term?`

Outputs:

- grouped counts
- stuck counts
- median lag if available

### `get_instructor_waits`

Purpose:
Surface instructor-related delays.

Inputs:

- `min_days_waiting`
- `limit` with hard cap `50`
- `org_unit_id?`
- `term?`

Outputs:

- course
- instructor name if allowed
- waiting since
- days waiting
- unit

### `get_staff_workload`

Purpose:
Summarize staffing pressure.

Inputs:

- `org_unit_id?`
- `limit` with hard cap `50`
- `sort_by`: `active_course_count | stuck_course_count | submitted_waiting_count`

Outputs:

- worker rows
- counts by selected metric

## Route design

Add:

- `apps/web/app/api/assistant/route.ts`

Recommended behavior:

1. Authenticate with `getAuthContext()`
2. Reject non-profile sessions with `401`
3. Allow only `provost`, `admin_full`, `super_admin` in phase 1
4. Parse `{ messages: [...] }` request body
5. Run the assistant with a fixed system prompt and the tool set above
6. Execute tools server-side only
7. Return:
   - assistant answer
   - tool trace summary
   - generated timestamp

Route constants:

- `export const runtime = "nodejs"`
- `export const dynamic = "force-dynamic"`

Optional later:

- streaming response
- persisted conversation history
- conversation titles

## Server modules

Recommended file layout:

- `apps/web/lib/assistant/types.ts`
- `apps/web/lib/assistant/authz.ts`
- `apps/web/lib/assistant/prompt.ts`
- `apps/web/lib/assistant/service.ts`
- `apps/web/lib/assistant/tools.ts`
- `apps/web/lib/assistant/logging.ts`
- `apps/web/lib/assistant/queries.ts`

Responsibilities:

- `authz.ts`: role gate and scope derivation
- `prompt.ts`: system prompt and answer style rules
- `service.ts`: model orchestration
- `tools.ts`: typed tool definitions and execution
- `logging.ts`: privacy-safe audit logs
- `queries.ts`: analytics query functions

## Authorization and scoping

Phase 1 scope rules:

- `super_admin`: institution-wide
- `admin_full`: institution-wide
- `provost`: institution-wide read-only

Even though phase 1 is institution-wide, keep scoping explicit in code because
future roles will be narrower.

Define a helper that returns:

- `scope.kind`: `institution | org_subtree | assigned_only`
- `scope.orgUnitIds`
- `scope.allowedRoles`

This avoids hardcoding institution-wide assumptions throughout the tool layer.

## Prompt rules

The system prompt should enforce:

- answer only from tool results
- if a question needs unavailable data, say so plainly
- do not guess exact counts
- prefer concise executive language
- cite time range and scope in answers
- surface uncertainty when data is partial
- suggest a sharper follow-up when useful

Example answer shape:

1. Direct answer in 1-3 sentences
2. Short bullet list of supporting facts
3. Optional follow-up suggestion

The model should not claim it queried "the database" directly. It should answer
as the product assistant using retrieved analytics results.

## Logging

Every assistant request should log:

- `user_id`
- `role`
- `request_id`
- `timestamp`
- `tool_names`
- `tool_count`
- `latency_ms`
- `outcome`

Do not log:

- full conversation history by default
- raw model responses for sensitive environments unless explicitly approved
- private notes or PII-heavy payloads beyond what operations requires

If prompt/result logging is needed for evaluation, gate it behind a dedicated
environment flag and redact aggressively.

## Safety controls

Required in phase 1:

- server-side only model access
- no arbitrary SQL tool
- hard tool input schemas
- row limits on all list tools
- statement timeout on heavy queries
- role gate at route boundary
- structured request logging
- graceful refusal for unsupported questions

Recommended:

- answer timeout budget per request
- rate limiting per user
- output length cap
- no attachment upload in phase 1

## Model choice

Use a tool-capable model already approved for the app's server-side AI usage.
The exact provider is less important than these requirements:

- good tool calling
- low hallucination under retrieval-only prompting
- acceptable latency for executive workflows

Do not tie the architecture to a single provider. Keep provider-specific code
isolated in `service.ts`.

## Suggested system prompt skeleton

```text
You are the BrightBridge Analytics Assistant.

You answer leadership questions about course migration progress using only the
approved analytics tools. Never invent counts, dates, statuses, or causes not
supported by tool results. If the available tools do not answer the question,
say what is missing and offer the closest useful summary.

Keep answers concise, executive-friendly, and operationally specific. Include
the relevant time range and scope when available. Prefer plain language over
database or internal implementation jargon.
```

## Example request flow

Question:

"Which departments are most behind right now, and why?"

Likely tool sequence:

1. `compare_units(metric="stuck_courses", limit=10)`
2. `get_bottleneck_breakdown(group_by="org_unit", date_range="last_30_days")`
3. `list_stuck_courses(min_days_stuck=7, limit=20)`

Likely answer:

- name the most delayed units
- quantify stuck volume
- explain the common bottleneck pattern
- propose a follow-up like "I can break this down by workflow phase if you want"

## Implementation phases

### Phase 1A: foundation

- Add `/assistant` page shell
- Add `/api/assistant/route.ts`
- Add role gate
- Add prompt + service scaffolding
- Implement 3 tools:
  - `get_overview_metrics`
  - `list_stuck_courses`
  - `compare_units`

### Phase 1B: richer analytics

- Add:
  - `summarize_recent_activity`
  - `get_bottleneck_breakdown`
  - `get_instructor_waits`
  - `get_staff_workload`
- Add response cards / mini tables
- Add evaluation fixtures

### Phase 1C: hardening

- Rate limiting
- Better observability
- query performance tuning
- optional result caching
- controlled prompt/result sampling for QA

## Validation

Before rollout, test:

1. Permission gating
   - disallowed roles receive `403`
2. Tool correctness
   - counts match dashboard/repository truth for seeded questions
3. Hallucination resistance
   - unsupported questions produce explicit limitation responses
4. Latency
   - p50 and p95 acceptable for leadership use
5. Output quality
   - answers are concise, correct, and reference scope/date range

Seed evaluation questions:

- "How many courses are at risk right now?"
- "Which unit has the worst backlog?"
- "What changed in the last 7 days?"
- "Show me courses stuck more than 14 days."
- "Where are instructors waiting longest?"

## Rollout

Recommended rollout order:

1. Hidden feature flag for `super_admin`
2. Internal QA with known-answer prompts
3. Limited release to `admin_full`
4. Release to `provost`
5. Expand to `admin_viewer` only after confirming scoping and output quality

## Recommendation

Build the assistant as a dedicated, read-only analytics product surface using
server-side tool calling over curated queries. That gives users the flexibility
to ask broad questions in their own words without exposing direct MCP/database
access or arbitrary SQL execution.
