# Graph Report - BrightBridge  (2026-04-29)

## Corpus Check
- 97 files · ~45,152 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 329 nodes · 420 edges · 20 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]

## God Nodes (most connected - your core abstractions)
1. `Select()` - 29 edges
2. `requireProfile()` - 14 edges
3. `createClient()` - 11 edges
4. `getCourseById()` - 11 edges
5. `CourseBridge Data Model Draft` - 11 edges
6. `getAuthContext()` - 10 edges
7. `createAdminClient()` - 10 edges
8. `transitionCourseStatus()` - 10 edges
9. `CourseBridge Development Plan` - 10 edges
10. `getSuperAdminData()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `checkMissingProfileAccess()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `createTempCourse()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `getProfileByEmail()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `signIn()` --calls--> `createClient()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/lib/supabase/server.ts
- `visibleCourses()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (35): AGENTS.md — Coding Agent Instructions, assertCanTransition() helper, auth.users (Supabase owned), CLAUDE.md — AI Development Context, Cloudflare R2 Storage, CourseBridge Data Model Draft, CourseBridge Development Plan, getAllowedTransitions() helper (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (21): NotFound(), requireProfile(), CourseWorkspaceLayout(), IssueLogPage(), MetadataPage(), ReviewMatrixPage(), admin(), getAssignedCourses() (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (16): getAuthContext(), isRole(), GET(), switchDevRole(), DevRoleSwitcher(), getAccessibleCourses(), signOut(), DashboardLayout() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (18): createTempCourse(), getProfileByEmail(), ensureAuthUser(), ensureStatusEvent(), findUserByEmail(), seedCourses(), seedReviewResponses(), upsertAssignments() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (12): requireAnyRole(), assertCanActOnCourse(), assignUserToCourse(), cleanOptionalText(), createCourse(), getAdminClientOrThrow(), insertStatusEvent(), toCourseStatus() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (15): canTransition() helper, Role: Admin, Role: Communications Department, Role: Instructor, Role: TA, Status: admin_changes_requested, Status: assigned_to_ta, Status: course_created (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.41
Nodes (11): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **30 isolated node(s):** `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief`, `@coursebridge/ui README` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 12`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 2` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 2` to `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Select()` (e.g. with `checkMissingProfileAccess()` and `createTempCourse()`) actually correct?**
  _`Select()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `requireProfile()` (e.g. with `CourseWorkspaceLayout()` and `SubmitPage()`) actually correct?**
  _`requireProfile()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `createClient()` (e.g. with `signIn()` and `GET()`) actually correct?**
  _`createClient()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getCourseById()` (e.g. with `CourseWorkspaceLayout()` and `SubmitPage()`) actually correct?**
  _`getCourseById()` has 9 INFERRED edges - model-reasoned connections that need verification._