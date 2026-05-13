# Graph Report - BrightBridge  (2026-05-13)

## Corpus Check
- 225 files · ~130,387 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 727 nodes · 839 edges · 40 communities detected
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 166|Community 166]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 168|Community 168]]
- [[_COMMUNITY_Community 169|Community 169]]
- [[_COMMUNITY_Community 170|Community 170]]
- [[_COMMUNITY_Community 171|Community 171]]
- [[_COMMUNITY_Community 172|Community 172]]
- [[_COMMUNITY_Community 173|Community 173]]
- [[_COMMUNITY_Community 174|Community 174]]

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
Nodes (44): getAdminCourseDetail(), NotFound(), requireProfile(), fetchReviewProgressForCourses(), getDepartments(), postCommentAction(), resolveEscalationAction(), sendEscalationReplyAction() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (45): approveReviewAction(), assignTaToCourseAction(), batchAssignTaAction(), createInstructorAndAssignAction(), requestFixesAction(), resolveEscalationAction(), searchAssignableCoursesAction(), searchCoursesForInstructorAction() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (19): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail(), signInWithPasswordAction() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (23): askReviewerMappings(), buildImportRows(), buildMatrixItem(), buildSectionPayloads(), cleanText(), combineNotes(), computePlan(), executeImport() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): collectUrlFixes(), combineNotes(), extractBrightspaceRef(), extractTermCode(), isWeakCourseCode(), joinNotes(), looksLikeCourseRef(), markdownReport() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (17): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (12): addCommentAction(), createIssueAction(), getIssueCountsForCoursesAction(), getIssuesForCourseAction(), getIssueWithCommentsAction(), updateIssueStatusAction(), handleAddComment(), handleStatusChange() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (6): DashboardContentShell(), DisplaySettings(), UpdateStatusTab(), useTweaks(), SidebarMenuButton(), useSidebar()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (7): isWeakCourseCode(), looksLikeCourseRef(), normalizeUrl(), parseCsv(), parseCsvLine(), resolveBrightspaceRef(), resolveCourseRef()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (8): createSupabaseCourseRepository(), fallbackStatusCounts(), fallbackTAWorkload(), findMatchingStaffProfileIds(), firstRelation(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (6): AdminRefreshWrapper(), CourseDetailRefreshWrapper(), CourseWorkspaceRefreshWrapper(), QueueRefreshWrapper(), TaRefreshWrapper(), useAutoRefresh()

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (2): complete(), playUpgradeConfetti()

### Community 22 - "Community 22"
Cohesion: 0.7
Nodes (4): clearUnsavedChanges(), getDirtySources(), hasUnsavedChanges(), setUnsavedChanges()

### Community 23 - "Community 23"
Cohesion: 0.6
Nodes (3): clearFilters(), goToPage(), setQuery()

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

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (2): MigrationPage(), getLatestMigrationReport()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): handleAdvance(), performSave()

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 38 - "Community 38"
Cohesion: 0.83
Nodes (3): buildPrompt(), POST(), sanitizeLine()

### Community 39 - "Community 39"
Cohesion: 0.83
Nodes (3): isProcessAlive(), readLockPid(), stopStaleNextDev()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (3): TADashboardPage, getAccessibleCourses, getCourseRepository

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (1): getAuthContext

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (1): createAdminClient

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (1): CourseRepository

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): assignTaToCourseAction

### Community 168 - "Community 168"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 169 - "Community 169"
Cohesion: 1.0
Nodes (1): InstructorDashboardPage

### Community 170 - "Community 170"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 171 - "Community 171"
Cohesion: 1.0
Nodes (1): AppSidebar

### Community 172 - "Community 172"
Cohesion: 1.0
Nodes (1): UsersView

### Community 173 - "Community 173"
Cohesion: 1.0
Nodes (1): NotificationProvider

### Community 174 - "Community 174"
Cohesion: 1.0
Nodes (1): StatusBadge

## Knowledge Gaps
- **20 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `getAuthContext`, `submitReview` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (6 nodes): `MindFreshModal.tsx`, `upgrade-confetti.ts`, `complete()`, `generateAiText()`, `reset()`, `playUpgradeConfetti()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `loadEnvFiles()`, `apply-migration.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `page.tsx`, `report.ts`, `MigrationPage()`, `getLatestMigrationReport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `metadata-form.tsx`, `handleAdvance()`, `parseTerm()`, `performSave()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (4 nodes): `middleware.ts`, `proxy.ts`, `updateSession()`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `getAuthContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `createAdminClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `CourseRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (1 nodes): `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (1 nodes): `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `AppSidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `NotificationProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireProfile()` connect `Community 0` to `Community 1`, `Community 2`, `Community 6`, `Community 33`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 2` to `Community 10`, `Community 5`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `requireProfile()` (e.g. with `createIssueAction()` and `updateIssueStatusAction()`) actually correct?**
  _`requireProfile()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminOverviewData()`) actually correct?**
  _`getCourseRepository()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `transitionCourseStatus()` (e.g. with `startTaReview()` and `submitReview()`) actually correct?**
  _`transitionCourseStatus()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 9 INFERRED edges - model-reasoned connections that need verification._