# Graph Report - BrightBridge  (2026-04-29)

## Corpus Check
- 103 files · ~49,207 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 346 nodes · 452 edges · 22 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `Select()` - 32 edges
2. `requireProfile()` - 14 edges
3. `createAdminClient()` - 12 edges
4. `createClient()` - 12 edges
5. `getCourseById()` - 11 edges
6. `CourseBridge Data Model Draft` - 11 edges
7. `getAuthContext()` - 10 edges
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
Cohesion: 0.17
Nodes (17): NotFound(), requireProfile(), CourseWorkspaceLayout(), IssueLogPage(), MetadataPage(), ReviewMatrixPage(), getCourseById(), admin() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (15): getAdmin(), getAdminCourseDetail(), getAdminCourses(), GET(), switchDevRole(), DevRoleSwitcher(), fetchReviewProgressForCourses(), signOut() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (18): createTempCourse(), getProfileByEmail(), ensureAuthUser(), ensureStatusEvent(), findUserByEmail(), seedCourses(), seedReviewResponses(), upsertAssignments() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (11): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), CoursesPage(), getAccessibleCourses(), admin(), getAssignedCourses(), transitionCourseStatus() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (15): canTransition() helper, Role: Admin, Role: Communications Department, Role: Instructor, Role: TA, Status: admin_changes_requested, Status: assigned_to_ta, Status: course_created (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.41
Nodes (11): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (10): requireAnyRole(), assertCanActOnCourse(), assignUserToCourse(), cleanOptionalText(), createCourse(), getAdminClientOrThrow(), insertStatusEvent(), toCourseStatus() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (5): getAuthContext(), isRole(), DashboardLayout(), DashboardPage(), SuperAdminDashboardPage()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **30 isolated node(s):** `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief`, `@coursebridge/ui README` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 7`, `Community 9`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 2` to `Community 11`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `Select()` (e.g. with `checkMissingProfileAccess()` and `createTempCourse()`) actually correct?**
  _`Select()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `requireProfile()` (e.g. with `CourseWorkspaceLayout()` and `SubmitPage()`) actually correct?**
  _`requireProfile()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `createAdminClient()` (e.g. with `DevRoleSwitcher()` and `switchDevRole()`) actually correct?**
  _`createAdminClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `createClient()` (e.g. with `signIn()` and `GET()`) actually correct?**
  _`createClient()` has 11 INFERRED edges - model-reasoned connections that need verification._