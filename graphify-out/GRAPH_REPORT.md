# Graph Report - BrightBridge  (2026-05-12)

## Corpus Check
- 215 files · ~121,732 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 703 nodes · 823 edges · 41 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 156|Community 156]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 158|Community 158]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 160|Community 160]]
- [[_COMMUNITY_Community 161|Community 161]]
- [[_COMMUNITY_Community 162|Community 162]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 166|Community 166]]
- [[_COMMUNITY_Community 167|Community 167]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 34 edges
2. `getCourseRepository()` - 18 edges
3. `transitionCourseStatus()` - 13 edges
4. `getAuthContext()` - 12 edges
5. `requireAnyRole()` - 12 edges
6. `getCourseById()` - 12 edges
7. `getProfileRepository()` - 12 edges
8. `text()` - 11 edges
9. `getAuthService()` - 11 edges
10. `CourseWorkspaceLayout()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/services/courses.ts
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/courses/service.ts
- `ensureViaSupabaseApi()` --calls--> `createClient()`  [INFERRED]
  scripts/ensure-dev-users.mjs → apps/web/lib/supabase/client.ts
- `upsertProfile()` --calls--> `switchDevRole()`  [INFERRED]
  scripts/seed-hierarchy.mjs → apps/web/components/dev-role-switcher-actions.ts
- `signIn()` --calls--> `createClient()`  [INFERRED]
  scripts/check-core-rls.mjs → apps/web/lib/supabase/client.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (59): approveReviewAction(), assignTaToCourseAction(), batchAssignTaAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction(), searchCoursesForInstructorAction() (+51 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (23): askReviewerMappings(), buildImportRows(), buildMatrixItem(), buildSectionPayloads(), cleanText(), combineNotes(), computePlan(), executeImport() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (21): SuperAdminAuditPage(), getAuthContext(), isRole(), SuperAdminCoursesPage(), DashboardLayout(), DashboardPage(), SuperAdminOrganizationPage(), getHierarchyRepository() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): collectUrlFixes(), combineNotes(), extractBrightspaceRef(), extractTermCode(), isWeakCourseCode(), joinNotes(), looksLikeCourseRef(), markdownReport() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (11): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail(), signInWithPasswordAction() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (16): postCommentAction(), resolveEscalationAction(), sendEscalationReplyAction(), createEscalationAction(), sendEscalationMessageAction(), getCommentRepository(), getEscalationRepository(), postCourseComment() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (13): NotificationProvider(), assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (12): addCommentAction(), createIssueAction(), getIssueCountsForCoursesAction(), getIssuesForCourseAction(), getIssueWithCommentsAction(), updateIssueStatusAction(), handleAddComment(), handleStatusChange() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (6): DashboardContentShell(), DisplaySettings(), UpdateStatusTab(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (7): isWeakCourseCode(), looksLikeCourseRef(), normalizeUrl(), parseCsv(), parseCsvLine(), resolveBrightspaceRef(), resolveCourseRef()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (8): createSupabaseCourseRepository(), fallbackStatusCounts(), fallbackTAWorkload(), findMatchingStaffProfileIds(), firstRelation(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 18 - "Community 18"
Cohesion: 0.43
Nodes (5): ensureEmailIdentities(), ensureViaPostgres(), ensureViaSupabaseApi(), findUserIdByEmail(), repairAuthTokenColumns()

### Community 23 - "Community 23"
Cohesion: 0.7
Nodes (4): clearUnsavedChanges(), getDirtySources(), hasUnsavedChanges(), setUnsavedChanges()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): assertCanTransition(), canTransition()

### Community 25 - "Community 25"
Cohesion: 0.6
Nodes (3): clearFilters(), goToPage(), setQuery()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (5): MetadataForm, ReviewMatrixForm, requireProfile, saveDraft, submitReview

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (1): getOpenIssuesCountAction()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): handleAdvance(), performSave()

### Community 39 - "Community 39"
Cohesion: 0.83
Nodes (3): isProcessAlive(), readLockPid(), stopStaleNextDev()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (3): TADashboardPage, getAccessibleCourses, getCourseRepository

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (1): UsersView

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 24`** (5 nodes): `transitions.ts`, `assertCanTransition()`, `canTransition()`, `getAllowedTransitions()`, `transitionAllowsRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `search.ts`, `getOpenIssuesCountAction()`, `getRecentIssuesAction()`, `searchIssuesAction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `metadata-form.tsx`, `handleAdvance()`, `parseTerm()`, `performSave()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 2`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 4` to `Community 11`, `Community 6`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Community 2` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `requireProfile()` (e.g. with `createIssueAction()` and `updateIssueStatusAction()`) actually correct?**
  _`requireProfile()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminOverviewData()`) actually correct?**
  _`getCourseRepository()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `transitionCourseStatus()` (e.g. with `startTaReview()` and `submitReview()`) actually correct?**
  _`transitionCourseStatus()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 9 INFERRED edges - model-reasoned connections that need verification._