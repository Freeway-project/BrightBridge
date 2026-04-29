# Graph Report - .  (2026-04-28)

## Corpus Check
- Corpus is ~6,388 words - fits in a single context window. You may not need a graph.

## Summary
- 131 nodes · 150 edges · 18 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Web App and Workflow UI|Web App and Workflow UI]]
- [[_COMMUNITY_Project Config and Tech Stack|Project Config and Tech Stack]]
- [[_COMMUNITY_Workflow Transitions and Data Model|Workflow Transitions and Data Model]]
- [[_COMMUNITY_Role-Status Workflow Rules|Role-Status Workflow Rules]]
- [[_COMMUNITY_Review Sections|Review Sections]]
- [[_COMMUNITY_Transitions Module|Transitions Module]]
- [[_COMMUNITY_UI Components and Middleware|UI Components and Middleware]]
- [[_COMMUNITY_Validation and Forms|Validation and Forms]]
- [[_COMMUNITY_UI Package Docs|UI Package Docs]]
- [[_COMMUNITY_README|README]]
- [[_COMMUNITY_Tech Stack Docs|Tech Stack Docs]]
- [[_COMMUNITY_Project Brief|Project Brief]]
- [[_COMMUNITY_Config Package Docs|Config Package Docs]]
- [[_COMMUNITY_Super Admin Role|Super Admin Role]]
- [[_COMMUNITY_Supabase Realtime|Supabase Realtime]]
- [[_COMMUNITY_Tailwind CSS|Tailwind CSS]]
- [[_COMMUNITY_TanStack Table|TanStack Table]]
- [[_COMMUNITY_Vercel Hosting|Vercel Hosting]]

## God Nodes (most connected - your core abstractions)
1. `workflow/index` - 19 edges
2. `CourseBridge Data Model Draft` - 11 edges
3. `CourseBridge Development Plan` - 10 edges
4. `Workflow Transitions Doc` - 8 edges
5. `DB Table: courses` - 8 edges
6. `CourseStatus` - 7 edges
7. `DB Table: profiles` - 7 edges
8. `DB Table: review_sections` - 7 edges
9. `Home` - 6 edges
10. `Workflow State Machine Layer` - 6 edges

## Surprising Connections (you probably didn't know these)
- `createClient (browser)` --conceptually_related_to--> `Supabase Postgres`  [INFERRED]
  apps/web/lib/supabase/client.ts → docs/tech-stack.md
- `createClient (server)` --conceptually_related_to--> `Supabase Auth`  [INFERRED]
  apps/web/lib/supabase/server.ts → docs/tech-stack.md
- `Role: Instructor` --conceptually_related_to--> `DB Table: review_invites`  [INFERRED]
  CLAUDE.md → docs/data-model.md
- `Home` --calls--> `Badge`  [EXTRACTED]
  apps/web/app/page.tsx → packages/ui/src/index.tsx
- `Home` --calls--> `COURSE_STATUSES`  [EXTRACTED]
  apps/web/app/page.tsx → packages/workflow/src/statuses.ts

## Communities

### Community 0 - "Web App and Workflow UI"
Cohesion: 0.18
Nodes (22): Badge, nextConfig, Home, getRoleLabel, Role, ROLE_LABELS, ROLES, COURSE_STATUS_LABELS (+14 more)

### Community 1 - "Project Config and Tech Stack"
Cohesion: 0.13
Nodes (18): AGENTS.md — Coding Agent Instructions, auth.users (Supabase owned), CLAUDE.md — AI Development Context, Cloudflare R2 Storage, CourseBridge Development Plan, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL, Next.js App Router (+10 more)

### Community 2 - "Workflow Transitions and Data Model"
Cohesion: 0.25
Nodes (16): assertCanTransition() helper, CourseBridge Data Model Draft, getAllowedTransitions() helper, @coursebridge/workflow README, Engineering Principle: No direct status updates from UI, Engineering Principle: Keep instructor-visible and internal comments separate, Engineering Principle: Use workflow state-machine layer, DB Table: course_assignments (+8 more)

### Community 3 - "Role-Status Workflow Rules"
Cohesion: 0.17
Nodes (15): canTransition() helper, Role: Admin, Role: Communications Department, Role: Instructor, Role: TA, Status: admin_changes_requested, Status: assigned_to_ta, Status: course_created (+7 more)

### Community 4 - "Review Sections"
Cohesion: 0.33
Nodes (6): Review Section: course_metadata, Review Section: general_notes, Review Section: gradebook_review, Review Section: review_matrix, Review Section: syllabus_review, DB Table: review_sections

### Community 5 - "Transitions Module"
Cohesion: 0.5
Nodes (2): assertCanTransition(), canTransition()

### Community 6 - "UI Components and Middleware"
Cohesion: 0.6
Nodes (5): Button, buttonVariants, RootLayout, updateSession, cn

### Community 8 - "Validation and Forms"
Cohesion: 0.67
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 17 - "UI Package Docs"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 27 - "README"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 28 - "Tech Stack Docs"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 29 - "Project Brief"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 30 - "Config Package Docs"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 31 - "Super Admin Role"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 32 - "Supabase Realtime"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 33 - "Tailwind CSS"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 34 - "TanStack Table"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 35 - "Vercel Hosting"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **33 isolated node(s):** `buttonVariants`, `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Transitions Module`** (5 nodes): `transitions.ts`, `assertCanTransition()`, `canTransition()`, `getAllowedTransitions()`, `transitionAllowsRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Package Docs`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `README`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tech Stack Docs`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Brief`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Package Docs`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Super Admin Role`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Realtime`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind CSS`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TanStack Table`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vercel Hosting`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CourseBridge Data Model Draft` connect `Workflow Transitions and Data Model` to `Project Config and Tech Stack`, `Review Sections`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `CourseBridge Development Plan` connect `Project Config and Tech Stack` to `Workflow Transitions and Data Model`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `Workflow Transitions Doc` connect `Workflow Transitions and Data Model` to `Project Config and Tech Stack`, `Role-Status Workflow Rules`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `buttonVariants`, `CourseBridge README`, `Workflow Overview Doc` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Config and Tech Stack` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._