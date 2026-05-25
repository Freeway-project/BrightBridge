# Graph Report - BrightBridge  (2026-05-25)

## Corpus Check
- 280 files · ~154,157 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 887 nodes · 1017 edges · 41 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 263 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 202|Community 202]]
- [[_COMMUNITY_Community 203|Community 203]]
- [[_COMMUNITY_Community 204|Community 204]]
- [[_COMMUNITY_Community 205|Community 205]]
- [[_COMMUNITY_Community 206|Community 206]]
- [[_COMMUNITY_Community 207|Community 207]]
- [[_COMMUNITY_Community 208|Community 208]]
- [[_COMMUNITY_Community 209|Community 209]]
- [[_COMMUNITY_Community 210|Community 210]]
- [[_COMMUNITY_Community 211|Community 211]]
- [[_COMMUNITY_Community 212|Community 212]]
- [[_COMMUNITY_Community 213|Community 213]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 42 edges
2. `getCourseRepository()` - 19 edges
3. `transitionCourseStatus()` - 17 edges
4. `requireAnyRole()` - 16 edges
5. `getAuthContext()` - 12 edges
6. `getProfileRepository()` - 12 edges
7. `text()` - 11 edges
8. `getAuthService()` - 11 edges
9. `getCourseById()` - 11 edges
10. `getSupabaseAdminClientOrThrow()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/courses/service.ts
- `assertCanTransition()` --calls--> `transitionCourseStatus()`  [INFERRED]
  packages/workflow/src/transitions.ts → apps/web/lib/services/courses.ts
- `getCourseStatusLabel()` --calls--> `courseToNotification()`  [INFERRED]
  packages/workflow/src/statuses.ts → apps/web/lib/notifications/queries.ts
- `ensureViaSupabaseApi()` --calls--> `createClient()`  [INFERRED]
  scripts/ensure-dev-users.mjs → apps/web/lib/supabase/client.ts
- `upsertProfile()` --calls--> `switchDevRole()`  [INFERRED]
  scripts/seed-hierarchy.mjs → apps/web/components/dev-role-switcher-actions.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (57): approveReviewAction(), assignTaToCourseAction(), batchApproveToStagingAction(), batchAssignTaAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction() (+49 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (30): SuperAdminAuditPage(), getAuthContext(), isRole(), getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (26): commentToNotification(), courseToNotification(), firstRelation(), formatAuthorName(), formatIssueStatus(), formatIssueType(), formatSeverity(), getCourseActionLabel() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (23): askReviewerMappings(), buildImportRows(), buildMatrixItem(), buildSectionPayloads(), cleanText(), combineNotes(), computePlan(), executeImport() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): AuthLayout(), handleAdvance(), performSave(), DashboardPage(), getSystemMigrationStatus(), isLocalPreviewHost(), isOldMigrationDomain(), isReadonlyMode() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (18): collectUrlFixes(), combineNotes(), extractBrightspaceRef(), extractTermCode(), isWeakCourseCode(), joinNotes(), looksLikeCourseRef(), markdownReport() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (21): emitUsers(), ensureChannel(), subscribeToOnlineUsers(), trackOnlinePresence(), assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (20): postSharedCommentAction(), postCommentAction(), resolveEscalationAction(), sendEscalationReplyAction(), createEscalationAction(), sendEscalationMessageAction(), getCommentRepository(), getEscalationRepository() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (13): addCommentAction(), createIssueAction(), getIssueCountsForCoursesAction(), getIssuesForCourseAction(), getIssueWithCommentsAction(), updateIssueStatusAction(), handleAddComment(), handleStatusChange() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (6): DashboardContentShell(), DisplaySettings(), UpdateStatusTab(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (7): isWeakCourseCode(), looksLikeCourseRef(), normalizeUrl(), parseCsv(), parseCsvLine(), resolveBrightspaceRef(), resolveCourseRef()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (5): handlePop(), complete(), playPopEffect(), playThematicReward(), playUpgradeConfetti()

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (5): RootLayout(), DashboardLayout(), getDeploymentVersion(), GET(), GET()

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 20 - "Community 20"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 21 - "Community 21"
Cohesion: 0.43
Nodes (6): fetchMeme(), handleOpenChange(), switchMode(), getMeme(), getRandomMeme(), getTrendingMeme()

### Community 23 - "Community 23"
Cohesion: 0.38
Nodes (3): clearFilters(), goToPage(), setQuery()

### Community 24 - "Community 24"
Cohesion: 0.38
Nodes (4): handleThemeClick(), getClipPaths(), polygonCollapsed(), runThemeTransition()

### Community 30 - "Community 30"
Cohesion: 0.7
Nodes (4): clearUnsavedChanges(), getDirtySources(), hasUnsavedChanges(), setUnsavedChanges()

### Community 33 - "Community 33"
Cohesion: 0.4
Nodes (5): MetadataForm, ReviewMatrixForm, requireProfile, saveDraft, submitReview

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 42 - "Community 42"
Cohesion: 0.83
Nodes (3): buildPrompt(), POST(), sanitizeLine()

### Community 44 - "Community 44"
Cohesion: 0.83
Nodes (3): isProcessAlive(), readLockPid(), stopStaleNextDev()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): TADashboardPage, getAccessibleCourses, getCourseRepository

### Community 202 - "Community 202"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 203 - "Community 203"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 204 - "Community 204"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 205 - "Community 205"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 206 - "Community 206"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 207 - "Community 207"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 208 - "Community 208"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 209 - "Community 209"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 210 - "Community 210"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 211 - "Community 211"
Cohesion: 1.0
Nodes (1): UsersView

### Community 212 - "Community 212"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 213 - "Community 213"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 35`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 202`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 203`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 205`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 206`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 207`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 208`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 209`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 213`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 1` to `Community 2`, `Community 6`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `getNotificationsPageData()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `requireProfile()` (e.g. with `createIssueAction()` and `updateIssueStatusAction()`) actually correct?**
  _`requireProfile()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminStatsData()`) actually correct?**
  _`getCourseRepository()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `transitionCourseStatus()` (e.g. with `startTaReview()` and `submitReview()`) actually correct?**
  _`transitionCourseStatus()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `requireAnyRole()` (e.g. with `createCourse()` and `assignUserToCourse()`) actually correct?**
  _`requireAnyRole()` has 15 INFERRED edges - model-reasoned connections that need verification._