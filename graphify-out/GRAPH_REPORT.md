# Graph Report - BrightBridge  (2026-04-30)

## Corpus Check
- 142 files · ~64,478 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 476 nodes · 624 edges · 26 communities detected
- Extraction: 67% EXTRACTED · 33% INFERRED · 0% AMBIGUOUS · INFERRED: 208 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]

## God Nodes (most connected - your core abstractions)
1. `Select()` - 29 edges
2. `requireProfile()` - 18 edges
3. `getAuthContext()` - 17 edges
4. `getCourseRepository()` - 16 edges
5. `GET()` - 13 edges
6. `createAdminClient()` - 12 edges
7. `transitionCourseStatus()` - 12 edges
8. `createClient()` - 11 edges
9. `getCourseById()` - 11 edges
10. `getProfileRepository()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `getAdminCourses()` --calls--> `Select()`  [INFERRED]
  apps/web/lib/admin/queries.ts → /Users/harshsaw/Github/BrightBridge/apps/web/components/ui/select.tsx
- `getAdminCourseDetail()` --calls--> `GET()`  [INFERRED]
  apps/web/lib/admin/queries.ts → /Users/harshsaw/Github/BrightBridge/apps/web/app/auth/callback/route.ts
- `getAdminCourseDetail()` --calls--> `Select()`  [INFERRED]
  apps/web/lib/admin/queries.ts → /Users/harshsaw/Github/BrightBridge/apps/web/components/ui/select.tsx
- `getAuthContext()` --calls--> `DashboardLayout()`  [INFERRED]
  apps/web/lib/auth/context.ts → /Users/harshsaw/Github/BrightBridge/apps/web/app/(dashboard)/layout.tsx
- `getAuthContext()` --calls--> `Select()`  [INFERRED]
  apps/web/lib/auth/context.ts → /Users/harshsaw/Github/BrightBridge/apps/web/components/ui/select.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (30): SuperAdminAuditPage(), getAuthContext(), isRole(), getAuthService(), SupabaseAuthService, GET(), switchDevRole(), SuperAdminCoursesPage() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (50): AGENTS.md — Coding Agent Instructions, assertCanTransition() helper, auth.users (Supabase owned), canTransition() helper, CLAUDE.md — AI Development Context, Cloudflare R2 Storage, CourseBridge Data Model Draft, CourseBridge Development Plan (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (26): getAdminCourseDetail(), getAdminCourses(), getAdminCoursesPage(), NotFound(), requireAnyRole(), requireProfile(), assignUserToCourse(), fetchReviewProgressForCourses() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (18): DevRoleSwitcher(), postCommentAction(), getCommentRepository(), createTempCourse(), getProfileByEmail(), ensureAuthUser(), ensureStatusEvent(), findUserByEmail() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (16): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), CoursesPage(), assertCanActOnCourse(), cleanOptionalText(), createCourse(), getAccessibleCourses() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (12): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (3): @coursebridge/validation README, React Hook Form, Zod

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (4): createSupabaseCourseRepository(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (4): applySearch(), clearFilters(), goToPage(), setQuery()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (2): @coursebridge/ui README, shadcn/ui

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): CourseBridge README

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Tech Stack Doc

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): CourseBridge Project Brief

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): @coursebridge/config README

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Role: Super Admin

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Supabase Realtime

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Tailwind CSS

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): TanStack Table

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Vercel Hosting

## Knowledge Gaps
- **30 isolated node(s):** `CourseBridge README`, `Workflow Overview Doc`, `Tech Stack Doc`, `CourseBridge Project Brief`, `@coursebridge/ui README` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 18`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `loadEnvFiles()`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`, `apply-migration.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `updateSession()`, `middleware.ts`, `proxy.ts`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (2 nodes): `@coursebridge/ui README`, `shadcn/ui`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `CourseBridge README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Tech Stack Doc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `CourseBridge Project Brief`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `@coursebridge/config README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Role: Super Admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Supabase Realtime`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Tailwind CSS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `TanStack Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Vercel Hosting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 3` to `Community 0`, `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `requireProfile()` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Select()` (e.g. with `upsertCourse()` and `ensureStatusEvent()`) actually correct?**
  _`Select()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCoursesPage()`) actually correct?**
  _`getCourseRepository()` has 15 INFERRED edges - model-reasoned connections that need verification._