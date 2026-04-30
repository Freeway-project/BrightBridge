# Graph Report - BrightBridge  (2026-04-29)

## Corpus Check
- 121 files · ~55,071 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 391 nodes · 512 edges · 23 communities detected
- Extraction: 64% EXTRACTED · 36% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]

## God Nodes (most connected - your core abstractions)
1. `Select()` - 29 edges
2. `requireProfile()` - 17 edges
3. `getCourseRepository()` - 14 edges
4. `GET()` - 13 edges
5. `getAuthContext()` - 13 edges
6. `createAdminClient()` - 11 edges
7. `createClient()` - 11 edges
8. `getCourseById()` - 11 edges
9. `CourseBridge Data Model Draft` - 11 edges
10. `getAuthService()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `createTempCourse()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `getProfileByEmail()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `checkMissingProfileAccess()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `visibleCourses()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx
- `visibleStatusEvents()` --calls--> `Select()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/components/ui/select.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (40): getAdminCourseDetail(), getAdminCourses(), NotFound(), getAuthContext(), isRole(), requireAnyRole(), requireProfile(), CoursesPage() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (35): AGENTS.md — Coding Agent Instructions, assertCanTransition() helper, auth.users (Supabase owned), CLAUDE.md — AI Development Context, Cloudflare R2 Storage, CourseBridge Data Model Draft, CourseBridge Development Plan, getAllowedTransitions() helper (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevRole(), signInWithPasswordAction() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.31
Nodes (12): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (15): canTransition() helper, Role: Admin, Role: Communications Department, Role: Instructor, Role: TA, Status: admin_changes_requested, Status: assigned_to_ta, Status: course_created (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (7): ensureAuthUser(), ensureStatusEvent(), findUserByEmail(), seedCourses(), seedReviewResponses(), upsertAssignments(), upsertCourse()

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (6): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), transitionCourseStatus(), assertCanTransition(), canTransition()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (5): postCommentAction(), getCommentRepository(), getCourseComments(), postCourseComment(), createSupabaseCommentRepository()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (4): createSupabaseCourseRepository(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (2): SuperAdminDashboardPage(), getSuperAdminData()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **30 isolated node(s):** `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief`, `@coursebridge/ui README` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `page.tsx`, `queries.ts`, `SuperAdminDashboardPage()`, `getSuperAdminData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 0` to `Community 2`, `Community 3`, `Community 7`, `Community 10`, `Community 16`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 0` to `Community 2`, `Community 20`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `requireProfile()` connect `Community 0` to `Community 10`, `Community 2`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Select()` (e.g. with `checkMissingProfileAccess()` and `createTempCourse()`) actually correct?**
  _`Select()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `requireProfile()` (e.g. with `postCommentAction()` and `AdminCourseDetailPage()`) actually correct?**
  _`requireProfile()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCourseDetail()`) actually correct?**
  _`getCourseRepository()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `GET()` (e.g. with `seedCourses()` and `.exchangeCodeForSession()`) actually correct?**
  _`GET()` has 12 INFERRED edges - model-reasoned connections that need verification._