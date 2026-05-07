# Graph Report - BrightBridge  (2026-05-07)

## Corpus Check
- 182 files · ~91,081 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 594 nodes · 683 edges · 38 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 191 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 137|Community 137]]
- [[_COMMUNITY_Community 138|Community 138]]
- [[_COMMUNITY_Community 139|Community 139]]
- [[_COMMUNITY_Community 140|Community 140]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 27 edges
2. `getCourseRepository()` - 17 edges
3. `getAuthContext()` - 13 edges
4. `getProfileRepository()` - 12 edges
5. `getAuthService()` - 11 edges
6. `getCourseById()` - 11 edges
7. `transitionCourseStatus()` - 11 edges
8. `requireAnyRole()` - 9 edges
9. `getEscalationRepository()` - 9 edges
10. `AdminCourseDetailPage()` - 9 edges

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
Nodes (46): approveReviewAction(), assignTaToCourseAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction(), searchCoursesForInstructorAction(), updateCourseDepartmentAction() (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (23): askReviewerMappings(), buildImportRows(), buildMatrixItem(), buildSectionPayloads(), cleanText(), combineNotes(), computePlan(), executeImport() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (17): NotFound(), IssueLogPage(), MetadataPage(), ReviewMatrixPage(), getAssignedCourses(), getCourseById(), toAssignmentRole(), transitionCourseStatus() (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (11): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail(), signInWithPasswordAction() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (13): NotificationProvider(), assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (12): SuperAdminAuditPage(), getAuthContext(), isRole(), SuperAdminCoursesPage(), DashboardLayout(), DashboardPage(), SuperAdminOrganizationPage(), SuperAdminDashboardPage() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (11): createEscalationAction(), sendEscalationMessageAction(), getEscalationRepository(), getCourseConversation(), addEscalationMessage(), countOpenEscalations(), createEscalation(), getEscalationsForCourse() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (4): DisplaySettings(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (5): createSupabaseCourseRepository(), findMatchingStaffProfileIds(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (8): getHierarchyRepository(), createSupabaseHierarchyRepository(), addUnitMemberAction(), createUnitAction(), createUserAction(), removeUnitMemberAction(), requireSuperAdmin(), updateUserRoleAction()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (2): parseCsv(), parseCsvLine()

### Community 18 - "Community 18"
Cohesion: 0.43
Nodes (5): ensureEmailIdentities(), ensureViaPostgres(), ensureViaSupabaseApi(), findUserIdByEmail(), repairAuthTokenColumns()

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

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): UsersView

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (7 nodes): `chunkArray()`, `fatal()`, `loadEnvFiles()`, `migrate-courses-from-csv.mjs`, `normDept()`, `parseCsv()`, `parseCsvLine()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
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
- **Thin community `Community 129`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 2`, `Community 13`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 3` to `Community 4`, `Community 12`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Community 0` to `Community 13`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCoursesPage()`) actually correct?**
  _`getCourseRepository()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `getProfileRepository()` (e.g. with `getAuthContext()` and `getSuperAdminData()`) actually correct?**
  _`getProfileRepository()` has 11 INFERRED edges - model-reasoned connections that need verification._