# Graph Report - BrightBridge  (2026-04-30)

## Corpus Check
- 121 files · ~55,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 391 nodes · 518 edges · 22 communities detected
- Extraction: 64% EXTRACTED · 36% INFERRED · 0% AMBIGUOUS · INFERRED: 188 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]

## God Nodes (most connected - your core abstractions)
1. `Select()` - 29 edges
2. `requireProfile()` - 17 edges
3. `getCourseRepository()` - 14 edges
4. `getAuthContext()` - 13 edges
5. `GET()` - 13 edges
6. `createAdminClient()` - 12 edges
7. `transitionCourseStatus()` - 12 edges
8. `createClient()` - 11 edges
9. `getCourseById()` - 11 edges
10. `CourseBridge Data Model Draft` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Role: Instructor` --conceptually_related_to--> `DB Table: review_invites`  [INFERRED]
  CLAUDE.md → docs/data-model.md
- `createTempCourse()` --calls--> `Select()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/scripts/check-core-rls.mjs → /Users/harshsaw/Github/BrightBridge/apps/web/components/ui/select.tsx
- `getProfileByEmail()` --calls--> `Select()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/scripts/check-core-rls.mjs → /Users/harshsaw/Github/BrightBridge/apps/web/components/ui/select.tsx
- `createAdminClient()` --calls--> `getSupabaseAdminClientOrThrow()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/supabase/admin.ts → /Users/harshsaw/Github/BrightBridge/apps/web/lib/repositories/supabase/shared.ts
- `getCourseRepository()` --calls--> `createSupabaseCourseRepository()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/repositories/index.ts → /Users/harshsaw/Github/BrightBridge/apps/web/lib/repositories/supabase/course-repository.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (37): getAdminCourseDetail(), getAdminCourses(), getAuthContext(), getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (27): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), NotFound(), isRole(), requireAnyRole(), requireProfile(), assertCanActOnCourse() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (35): AGENTS.md — Coding Agent Instructions, assertCanTransition() helper, auth.users (Supabase owned), CLAUDE.md — AI Development Context, Cloudflare R2 Storage, CourseBridge Data Model Draft, CourseBridge Development Plan, getAllowedTransitions() helper (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.27
Nodes (14): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (15): canTransition() helper, Role: Admin, Role: Communications Department, Role: Instructor, Role: TA, Status: admin_changes_requested, Status: assigned_to_ta, Status: course_created (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (7): ensureAuthUser(), ensureStatusEvent(), findUserByEmail(), seedCourses(), seedReviewResponses(), upsertAssignments(), upsertCourse()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (4): createSupabaseCourseRepository(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (2): assertCanTransition(), canTransition()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (2): SuperAdminDashboardPage(), getSuperAdminData()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **30 isolated node(s):** `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief`, `@coursebridge/ui README` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (5 nodes): `assertCanTransition()`, `canTransition()`, `getAllowedTransitions()`, `transitionAllowsRole()`, `transitions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `loadEnvFiles()`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`, `apply-migration.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `SuperAdminDashboardPage()`, `getSuperAdminData()`, `page.tsx`, `queries.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (4 nodes): `updateSession()`, `middleware.ts`, `proxy.ts`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 0` to `Community 1`, `Community 3`, `Community 7`, `Community 15`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 0` to `Community 1`, `Community 18`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `requireProfile()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Select()` (e.g. with `upsertCourse()` and `ensureStatusEvent()`) actually correct?**
  _`Select()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCourseDetail()`) actually correct?**
  _`getCourseRepository()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getAuthContext()` (e.g. with `.getCurrentSessionUser()` and `getAuthService()`) actually correct?**
  _`getAuthContext()` has 10 INFERRED edges - model-reasoned connections that need verification._