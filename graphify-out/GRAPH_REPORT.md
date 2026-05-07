# Graph Report - BrightBridge  (2026-05-07)

## Corpus Check
- 181 files · ~89,357 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 575 nodes · 642 edges · 34 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 189 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 26 edges
2. `getCourseRepository()` - 17 edges
3. `getAuthContext()` - 13 edges
4. `getProfileRepository()` - 12 edges
5. `getAuthService()` - 11 edges
6. `getCourseById()` - 11 edges
7. `transitionCourseStatus()` - 11 edges
8. `getEscalationRepository()` - 9 edges
9. `AdminCourseDetailPage()` - 9 edges
10. `SupabaseAuthService` - 8 edges

## Surprising Connections (you probably didn't know these)
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/courses/service.ts
- `ensureViaSupabaseApi()` --calls--> `createClient()`  [INFERRED]
  scripts/ensure-dev-users.mjs → apps/web/lib/supabase/client.ts
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/services/courses.ts
- `upsertProfile()` --calls--> `switchDevRole()`  [INFERRED]
  scripts/seed-hierarchy.mjs → apps/web/components/dev-role-switcher-actions.ts
- `signIn()` --calls--> `createClient()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/lib/supabase/client.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (44): approveReviewAction(), assignTaToCourseAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction(), searchCoursesForInstructorAction(), updateCourseDepartmentAction() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (24): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail(), signInWithPasswordAction() (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): getAdminCourseDetail(), NotFound(), fetchReviewProgressForCourses(), getDepartments(), CourseWorkspaceLayout(), AdminCourseDetailPage(), IssueLogPage(), MetadataPage() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (15): createEscalationAction(), sendEscalationMessageAction(), getCommentRepository(), getEscalationRepository(), getCourseComments(), postCourseComment(), getCourseConversation(), addEscalationMessage() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (13): NotificationProvider(), assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (11): askReviewerMappings(), buildImportRows(), cleanText(), computePlan(), executeImport(), extractBrightspaceCourseId(), findProfileByEmail(), groupBy() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (4): DisplaySettings(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 13 - "Community 13"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (2): parseCsv(), parseCsvLine()

### Community 15 - "Community 15"
Cohesion: 0.43
Nodes (5): ensureEmailIdentities(), ensureViaPostgres(), ensureViaSupabaseApi(), findUserIdByEmail(), repairAuthTokenColumns()

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (2): if(), SaveState()

### Community 22 - "Community 22"
Cohesion: 0.6
Nodes (3): clearFilters(), goToPage(), setQuery()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (5): MetadataForm, ReviewMatrixForm, requireProfile, saveDraft, submitReview

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (3): TADashboardPage, getAccessibleCourses, getCourseRepository

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 126 - "Community 126"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 127 - "Community 127"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): UsersView

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (7 nodes): `chunkArray()`, `fatal()`, `loadEnvFiles()`, `migrate-courses-from-csv.mjs`, `normDept()`, `parseCsv()`, `parseCsvLine()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `if()`, `page.tsx`, `issue-log-table.tsx`, `IssueLogTable()`, `SaveState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCoursesPage()`) actually correct?**
  _`getCourseRepository()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `getProfileRepository()` (e.g. with `getAuthContext()` and `getSuperAdminData()`) actually correct?**
  _`getProfileRepository()` has 11 INFERRED edges - model-reasoned connections that need verification._