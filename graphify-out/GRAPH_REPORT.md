# Graph Report - BrightBridge  (2026-05-04)

## Corpus Check
- 173 files · ~79,487 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 591 nodes · 579 edges · 90 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 174 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
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
- [[_COMMUNITY_Community 141|Community 141]]
- [[_COMMUNITY_Community 142|Community 142]]
- [[_COMMUNITY_Community 143|Community 143]]
- [[_COMMUNITY_Community 144|Community 144]]
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
- [[_COMMUNITY_Community 168|Community 168]]
- [[_COMMUNITY_Community 169|Community 169]]
- [[_COMMUNITY_Community 170|Community 170]]
- [[_COMMUNITY_Community 171|Community 171]]
- [[_COMMUNITY_Community 172|Community 172]]
- [[_COMMUNITY_Community 173|Community 173]]
- [[_COMMUNITY_Community 174|Community 174]]
- [[_COMMUNITY_Community 175|Community 175]]
- [[_COMMUNITY_Community 176|Community 176]]
- [[_COMMUNITY_Community 177|Community 177]]
- [[_COMMUNITY_Community 178|Community 178]]
- [[_COMMUNITY_Community 179|Community 179]]
- [[_COMMUNITY_Community 180|Community 180]]
- [[_COMMUNITY_Community 181|Community 181]]
- [[_COMMUNITY_Community 182|Community 182]]
- [[_COMMUNITY_Community 183|Community 183]]
- [[_COMMUNITY_Community 184|Community 184]]
- [[_COMMUNITY_Community 185|Community 185]]
- [[_COMMUNITY_Community 186|Community 186]]
- [[_COMMUNITY_Community 187|Community 187]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 23 edges
2. `getCourseRepository()` - 16 edges
3. `getAuthContext()` - 13 edges
4. `getProfileRepository()` - 11 edges
5. `transitionCourseStatus()` - 11 edges
6. `getAuthService()` - 10 edges
7. `getCourseById()` - 10 edges
8. `signIn()` - 8 edges
9. `SupabaseAuthService` - 8 edges
10. `getReviewRepository()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getAuthService()` --calls--> `getAuthContext()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts → apps/web/lib/auth/context.ts
- `getAuthService()` --calls--> `createUserAction()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts → apps/web/app/(dashboard)/super-admin/actions.ts
- `getAuthService()` --calls--> `updateUserRoleAction()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts → apps/web/app/(dashboard)/super-admin/actions.ts
- `getAuthService()` --calls--> `signInWithPasswordAction()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts → apps/web/app/auth/login/actions.ts
- `getAuthService()` --calls--> `signInAsDevEmail()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts → apps/web/app/auth/login/actions.ts

## Hyperedges (group relationships)
- **Core Workflow Engine** — workflow_roles, workflow_transitions [EXTRACTED 1.00]
- **Database Seeding Pipeline** — scripts_hierarchy_analyzer, scripts_seed_all, scripts_seed_hierarchy [INFERRED 0.90]
- **Design Handoff Toolset** — design_canvas, tweaks_panel [INFERRED 0.85]
- **Sentry Error Monitoring System** — web_sentry_client_config, web_sentry_server_config, web_sentry_edge_config, web_instrumentation, web_next_config [EXTRACTED 1.00]
- **Review Workspace Logic** — web_lib_workspace_actions_saveDraft, web_lib_workspace_actions_submitReview, web_lib_workspace_constants_CHECKLIST, web_lib_workspace_schemas_metadataSchema [INFERRED 0.90]
- **Admin Dashboard Data Sources** — web_lib_admin_queries_getAdminCourses, web_lib_super_admin_queries_getSuperAdminData [INFERRED 0.70]
- **Supabase Repository Pattern** — supabase_course_repository, supabase_profile_repository, supabase_review_repository, supabase_comment_repository, supabase_hierarchy_repository [INFERRED 0.95]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (44): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), resolveEscalationAction(), getAdminCourseDetail(), getAdminCourses(), getAdminCoursesPage(), NotFound() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (22): SuperAdminAuditPage(), getAuthContext(), isRole(), SuperAdminCoursesPage(), DashboardLayout(), DashboardPage(), SuperAdminOrganizationPage(), getHierarchyRepository() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (13): getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail(), signInWithPasswordAction() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): postCommentAction(), resolveEscalationAction(), sendEscalationReplyAction(), createEscalationAction(), sendEscalationMessageAction(), getCommentRepository(), getEscalationRepository(), getCourseComments() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (14): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (7): getCourseInstructor(), getProfilesByRole(), createSupabaseCourseRepository(), findMatchingStaffProfileIds(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

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

### Community 19 - "Community 19"
Cohesion: 0.6
Nodes (3): clearFilters(), goToPage(), setQuery()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (2): if(), SaveState()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (3): AdminCourseSidebar, QueueRow, approveReviewAction

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): ReviewTimer, SyllabusGradebookForm, WorkspaceNav

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): CourseBridge, apps/web, packages/workflow

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): AdminAssignmentPanel, assignTaToCourseAction

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): CourseChat, postCommentAction

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): MetadataForm, MetadataPage

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (2): DepartmentMonitor, StatCard

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (2): InstructorCourseList, InstructorDashboardPage

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): AuditView, Table

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): Card, OrganizationView

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (2): CoursesView, StatusBadge

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): CourseActionButton, CourseTable

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): CourseCard, CourseListView

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (2): profiles, ta

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (2): course_created, courses

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): Hierarchy Analysis Data

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/error.tsx

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): DashboardError

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/layout.tsx

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): DashboardLayout

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/admin/page.tsx

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/admin/actions.ts

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): requestFixesAction

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (1): AssignedCoursesTable

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (1): ReviewQueueTable

### Community 142 - "Community 142"
Cohesion: 1.0
Nodes (1): AdminQueuePage

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (1): CourseReviewDetail

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): TADashboardPage

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (1): SuperAdminDashboardPage

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): createUserAction

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (1): SuperAdminAuditPage

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (1): SuperAdminUsersPage

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (1): SuperAdminOrganizationPage

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (1): SuperAdminCoursesPage

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): CommunicationsDashboardPage

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (1): CoursesPage

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (1): CourseWorkspaceIndexPage

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (1): CourseWorkspaceLayout

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (1): IssueLogTable

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (1): SubmitPanel

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (1): ReviewMatrixForm

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (1): InfoPanel

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (1): IssueDrawer

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (1): IssueLogPage

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (1): SubmitPage

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (1): SyllabusGradebookPage

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (1): ReviewMatrixPage

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (1): GET_callback

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): DevRoleSwitcher

### Community 168 - "Community 168"
Cohesion: 1.0
Nodes (1): ErrorDisplay

### Community 169 - "Community 169"
Cohesion: 1.0
Nodes (1): TweakProvider

### Community 170 - "Community 170"
Cohesion: 1.0
Nodes (1): PaginationControls

### Community 171 - "Community 171"
Cohesion: 1.0
Nodes (1): Topbar

### Community 172 - "Community 172"
Cohesion: 1.0
Nodes (1): Sidebar

### Community 173 - "Community 173"
Cohesion: 1.0
Nodes (1): Avatar

### Community 174 - "Community 174"
Cohesion: 1.0
Nodes (1): Badge

### Community 175 - "Community 175"
Cohesion: 1.0
Nodes (1): Tabs

### Community 176 - "Community 176"
Cohesion: 1.0
Nodes (1): ScrollArea

### Community 177 - "Community 177"
Cohesion: 1.0
Nodes (1): Separator

### Community 178 - "Community 178"
Cohesion: 1.0
Nodes (1): Sheet

### Community 179 - "Community 179"
Cohesion: 1.0
Nodes (1): Input

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (1): Progress

### Community 181 - "Community 181"
Cohesion: 1.0
Nodes (1): Select

### Community 182 - "Community 182"
Cohesion: 1.0
Nodes (1): UsersView

### Community 183 - "Community 183"
Cohesion: 1.0
Nodes (1): OverviewView

### Community 184 - "Community 184"
Cohesion: 1.0
Nodes (1): course_assignments

### Community 185 - "Community 185"
Cohesion: 1.0
Nodes (1): organizational_units

### Community 186 - "Community 186"
Cohesion: 1.0
Nodes (1): super_admin

### Community 187 - "Community 187"
Cohesion: 1.0
Nodes (1): final_approved

## Knowledge Gaps
- **4 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `Hierarchy Analysis Data`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (5 nodes): `if()`, `page.tsx`, `IssueLogTable()`, `SaveState()`, `issue-log-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (4 nodes): `loadEnvFiles()`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`, `apply-migration.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (4 nodes): `updateSession()`, `middleware.ts`, `proxy.ts`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (2 nodes): `AdminAssignmentPanel`, `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (2 nodes): `CourseChat`, `postCommentAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (2 nodes): `MetadataForm`, `MetadataPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (2 nodes): `DepartmentMonitor`, `StatCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (2 nodes): `InstructorCourseList`, `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (2 nodes): `AuditView`, `Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (2 nodes): `Card`, `OrganizationView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (2 nodes): `CoursesView`, `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (2 nodes): `CourseActionButton`, `CourseTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (2 nodes): `CourseCard`, `CourseListView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (2 nodes): `profiles`, `ta`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (2 nodes): `course_created`, `courses`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `Hierarchy Analysis Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `apps/web/app/(dashboard)/error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `DashboardError`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `apps/web/app/(dashboard)/layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `DashboardLayout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `apps/web/app/(dashboard)/admin/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `apps/web/app/(dashboard)/admin/actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `requestFixesAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `AssignedCoursesTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `ReviewQueueTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (1 nodes): `AdminQueuePage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (1 nodes): `CourseReviewDetail`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `TADashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (1 nodes): `SuperAdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (1 nodes): `createUserAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (1 nodes): `SuperAdminAuditPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (1 nodes): `SuperAdminUsersPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (1 nodes): `SuperAdminOrganizationPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (1 nodes): `SuperAdminCoursesPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (1 nodes): `CommunicationsDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (1 nodes): `CoursesPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `CourseWorkspaceIndexPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `CourseWorkspaceLayout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `IssueLogTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `SubmitPanel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `ReviewMatrixForm`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `InfoPanel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (1 nodes): `IssueDrawer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (1 nodes): `IssueLogPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (1 nodes): `SubmitPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `SyllabusGradebookPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `ReviewMatrixPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `GET_callback`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (1 nodes): `DevRoleSwitcher`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (1 nodes): `ErrorDisplay`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (1 nodes): `TweakProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (1 nodes): `PaginationControls`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `Topbar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `Sidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `Avatar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `Badge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `Tabs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (1 nodes): `ScrollArea`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `Separator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (1 nodes): `Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (1 nodes): `Input`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (1 nodes): `Progress`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 181`** (1 nodes): `Select`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 182`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (1 nodes): `OverviewView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (1 nodes): `course_assignments`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (1 nodes): `organizational_units`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 186`** (1 nodes): `super_admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 187`** (1 nodes): `final_approved`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getProfileRepository()` connect `Community 1` to `Community 0`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `requireProfile()` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `getAuthContext()` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCoursesPage()`) actually correct?**
  _`getCourseRepository()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getProfileRepository()` (e.g. with `getAuthContext()` and `getSuperAdminData()`) actually correct?**
  _`getProfileRepository()` has 10 INFERRED edges - model-reasoned connections that need verification._