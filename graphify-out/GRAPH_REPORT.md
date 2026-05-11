# Graph Report - BrightBridge  (2026-05-11)

## Corpus Check
- 206 files · ~112,669 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 685 nodes · 798 edges · 37 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 211 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 145|Community 145]]
- [[_COMMUNITY_Community 146|Community 146]]
- [[_COMMUNITY_Community 147|Community 147]]
- [[_COMMUNITY_Community 148|Community 148]]
- [[_COMMUNITY_Community 149|Community 149]]
- [[_COMMUNITY_Community 150|Community 150]]
- [[_COMMUNITY_Community 151|Community 151]]
- [[_COMMUNITY_Community 152|Community 152]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 154|Community 154]]
- [[_COMMUNITY_Community 155|Community 155]]
- [[_COMMUNITY_Community 156|Community 156]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 30 edges
2. `getCourseRepository()` - 18 edges
3. `getAuthContext()` - 12 edges
4. `requireAnyRole()` - 12 edges
5. `getProfileRepository()` - 12 edges
6. `transitionCourseStatus()` - 12 edges
7. `text()` - 11 edges
8. `getAuthService()` - 11 edges
9. `getCourseById()` - 11 edges
10. `getAdminCourseDetail()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ensureViaSupabaseApi()` --calls--> `createClient()`  [INFERRED]
  scripts/ensure-dev-users.mjs → apps/web/lib/supabase/client.ts
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/services/courses.ts
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/courses/service.ts
- `upsertProfile()` --calls--> `switchDevRole()`  [INFERRED]
  scripts/seed-hierarchy.mjs → apps/web/components/dev-role-switcher-actions.ts
- `signIn()` --calls--> `createClient()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/lib/supabase/client.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (61): approveReviewAction(), assignTaToCourseAction(), batchAssignTaAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction(), searchCoursesForInstructorAction() (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (32): SuperAdminAuditPage(), getAuthContext(), isRole(), getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (23): askReviewerMappings(), buildImportRows(), buildMatrixItem(), buildSectionPayloads(), cleanText(), combineNotes(), computePlan(), executeImport() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): collectUrlFixes(), combineNotes(), extractBrightspaceRef(), extractTermCode(), isWeakCourseCode(), joinNotes(), looksLikeCourseRef(), markdownReport() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (18): postCommentAction(), resolveEscalationAction(), sendEscalationReplyAction(), createEscalationAction(), sendEscalationMessageAction(), getCommentRepository(), getEscalationRepository(), getCourseComments() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (13): NotificationProvider(), assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (6): DashboardContentShell(), DisplaySettings(), UpdateStatusTab(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (7): isWeakCourseCode(), looksLikeCourseRef(), normalizeUrl(), parseCsv(), parseCsvLine(), resolveBrightspaceRef(), resolveCourseRef()

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (8): createSupabaseCourseRepository(), fallbackStatusCounts(), fallbackTAWorkload(), findMatchingStaffProfileIds(), firstRelation(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 15 - "Community 15"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 16 - "Community 16"
Cohesion: 0.43
Nodes (5): ensureEmailIdentities(), ensureViaPostgres(), ensureViaSupabaseApi(), findUserIdByEmail(), repairAuthTokenColumns()

### Community 23 - "Community 23"
Cohesion: 0.7
Nodes (4): clearUnsavedChanges(), getDirtySources(), hasUnsavedChanges(), setUnsavedChanges()

### Community 24 - "Community 24"
Cohesion: 0.6
Nodes (3): clearFilters(), goToPage(), setQuery()

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (2): if(), SaveState()

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (5): MetadataForm, ReviewMatrixForm, requireProfile, saveDraft, submitReview

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 37 - "Community 37"
Cohesion: 0.83
Nodes (3): isProcessAlive(), readLockPid(), stopStaleNextDev()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): TADashboardPage, getAccessibleCourses, getCourseRepository

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (1): UsersView

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (5 nodes): `if()`, `page.tsx`, `issue-log-table.tsx`, `IssueLogTable()`, `SaveState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 1` to `Community 9`, `Community 5`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminOverviewData()`) actually correct?**
  _`getCourseRepository()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `requireAnyRole()` (e.g. with `createCourse()` and `assignUserToCourse()`) actually correct?**
  _`requireAnyRole()` has 11 INFERRED edges - model-reasoned connections that need verification._