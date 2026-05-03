# Graph Report - .  (2026-05-03)

## Corpus Check
- 176 files · ~81,275 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 568 nodes · 550 edges · 104 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 161 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Authentication and Super Admin Actions|Authentication and Super Admin Actions]]
- [[_COMMUNITY_Course Management and Auth Context|Course Management and Auth Context]]
- [[_COMMUNITY_Course Workflow and Services|Course Workflow and Services]]
- [[_COMMUNITY_RLS Checking and Seeding|RLS Checking and Seeding]]
- [[_COMMUNITY_Instructor Import Scripts|Instructor Import Scripts]]
- [[_COMMUNITY_Repository and Service Abstractions|Repository and Service Abstractions]]
- [[_COMMUNITY_Course Instructor Import Logic|Course Instructor Import Logic]]
- [[_COMMUNITY_Supabase Repository Implementation|Supabase Repository Implementation]]
- [[_COMMUNITY_Hierarchy Analysis Script|Hierarchy Analysis Script]]
- [[_COMMUNITY_Course and Assignment Import|Course and Assignment Import]]
- [[_COMMUNITY_Admin Dashboard Components|Admin Dashboard Components]]
- [[_COMMUNITY_Course Comments and Chat|Course Comments and Chat]]
- [[_COMMUNITY_Review Workspace Logic|Review Workspace Logic]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
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
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
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
- [[_COMMUNITY_Community 188|Community 188]]
- [[_COMMUNITY_Community 189|Community 189]]
- [[_COMMUNITY_Community 190|Community 190]]
- [[_COMMUNITY_Community 191|Community 191]]
- [[_COMMUNITY_Community 192|Community 192]]
- [[_COMMUNITY_Community 193|Community 193]]

## God Nodes (most connected - your core abstractions)
1. `requireProfile()` - 18 edges
2. `getCourseRepository()` - 16 edges
3. `getAuthContext()` - 13 edges
4. `getProfileRepository()` - 11 edges
5. `transitionCourseStatus()` - 11 edges
6. `getAuthService()` - 10 edges
7. `getCourseById()` - 10 edges
8. `Repository Factory` - 10 edges
9. `getReviewRepository()` - 9 edges
10. `Select()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `transitionCourseStatus()` --calls--> `assertCanTransition()`  [INFERRED]
  apps/web/lib/courses/service.ts → packages/workflow/src/transitions.ts
- `getAuthContext()` --calls--> `getAuthService()`  [INFERRED]
  apps/web/lib/auth/context.ts → /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts
- `signInWithPasswordAction()` --calls--> `getAuthService()`  [INFERRED]
  apps/web/app/auth/login/actions.ts → /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts
- `signInAsDevEmail()` --calls--> `getAuthService()`  [INFERRED]
  apps/web/app/auth/login/actions.ts → /Users/harshsaw/Github/BrightBridge/apps/web/lib/auth/service.ts
- `DashboardLayout()` --calls--> `getAuthContext()`  [INFERRED]
  /Users/harshsaw/Github/BrightBridge/apps/web/app/(dashboard)/layout.tsx → apps/web/lib/auth/context.ts

## Hyperedges (group relationships)
- **Core Workflow Engine** — workflow_roles, workflow_transitions [EXTRACTED 1.00]
- **Database Seeding Pipeline** — scripts_hierarchy_analyzer, scripts_seed_all, scripts_seed_hierarchy [INFERRED 0.90]
- **Design Handoff Toolset** — design_canvas, tweaks_panel [INFERRED 0.85]
- **Sentry Error Monitoring System** — web_sentry_client_config, web_sentry_server_config, web_sentry_edge_config, web_instrumentation, web_next_config [EXTRACTED 1.00]
- **Review Workspace Logic** — web_lib_workspace_actions_saveDraft, web_lib_workspace_actions_submitReview, web_lib_workspace_constants_CHECKLIST, web_lib_workspace_schemas_metadataSchema [INFERRED 0.90]
- **Admin Dashboard Data Sources** — web_lib_admin_queries_getAdminCourses, web_lib_super_admin_queries_getSuperAdminData [INFERRED 0.70]
- **Supabase Repository Pattern** — supabase_course_repository, supabase_profile_repository, supabase_review_repository, supabase_comment_repository, supabase_hierarchy_repository [INFERRED 0.95]

## Communities

### Community 0 - "Authentication and Super Admin Actions"
Cohesion: 0.06
Nodes (26): SuperAdminAuditPage(), getAuthService(), SupabaseAuthService, GET(), switchDevRole(), DevRoleSwitcher(), signOut(), signInAsDevEmail() (+18 more)

### Community 1 - "Course Management and Auth Context"
Cohesion: 0.07
Nodes (34): approveReviewAction(), assignTaToCourseAction(), requestFixesAction(), getAdminCourseDetail(), getAdminCourses(), getAdminCoursesPage(), getAuthContext(), isRole() (+26 more)

### Community 2 - "Course Workflow and Services"
Cohesion: 0.09
Nodes (19): NotFound(), CourseWorkspaceLayout(), IssueLogPage(), MetadataPage(), ReviewMatrixPage(), getAssignedCourses(), getCourseById(), transitionCourseStatus() (+11 more)

### Community 3 - "RLS Checking and Seeding"
Cohesion: 0.13
Nodes (21): assertEqual(), assertHasSource(), assertMissingSource(), checkAdminAccess(), checkCommunicationsAccess(), checkInstructorAccess(), checkMissingProfileAccess(), checkTaAccess() (+13 more)

### Community 4 - "Instructor Import Scripts"
Cohesion: 0.25
Nodes (12): buildDbDryRunSummary(), buildStats(), chunkArray(), fetchExistingCourseInstructorPairs(), fetchExistingValues(), isSimpleValidEmail(), normalizeEmail(), normalizeText() (+4 more)

### Community 6 - "Repository and Service Abstractions"
Cohesion: 0.21
Nodes (13): Courses Service, Repository Factory, Comments Service, Legacy Courses Service, Profiles Service, Review Service, createAdminClient, Supabase Comment Repository (+5 more)

### Community 7 - "Course Instructor Import Logic"
Cohesion: 0.22
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 8 - "Supabase Repository Implementation"
Cohesion: 0.2
Nodes (4): createSupabaseCourseRepository(), toCourseSummary(), getSupabaseAdminClientOrThrow(), toCourseStatus()

### Community 10 - "Hierarchy Analysis Script"
Cohesion: 0.25
Nodes (5): derive_name_from_email(), name_matches_email(), Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-, Both the first initial AND some part of the surname must appear in the email pre, Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.

### Community 11 - "Course and Assignment Import"
Cohesion: 0.32
Nodes (4): normalizeEmail(), normalizeText(), parseCsv(), parseCsvLine()

### Community 12 - "Admin Dashboard Components"
Cohesion: 0.36
Nodes (4): applySearch(), clearFilters(), goToPage(), setQuery()

### Community 13 - "Course Comments and Chat"
Cohesion: 0.29
Nodes (5): postCommentAction(), getCommentRepository(), getCourseComments(), postCourseComment(), createSupabaseCommentRepository()

### Community 15 - "Review Workspace Logic"
Cohesion: 0.33
Nodes (4): getAuthContext(), saveDraft(), Review Checklist, Metadata Validation Schema

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (2): parseDatabaseUrl(), parseSupabaseDatabaseUrl()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (2): updateSession(), proxy()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): Dev Course Seeder, Workflow Roles Definition, Course Transition Rules

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): Hierarchy CSV Analyzer, Hierarchy Analysis Data, Master Seeding Script

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (3): Design Canvas Wrapper, Omelette Host Bridge, Tweaks Panel System

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (3): Next.js Instrumentation, Sentry Edge Config, Sentry Server Config

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): AdminCourseSidebar, QueueRow, approveReviewAction

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (3): ReviewTimer, SyllabusGradebookForm, WorkspaceNav

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): CourseBridge, apps/web, packages/workflow

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (2): AdminAssignmentPanel, assignTaToCourseAction

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (2): CourseChat, postCommentAction

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): MetadataForm, MetadataPage

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): InstructorCourseList, InstructorDashboardPage

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): DepartmentMonitor, StatCard

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (2): Card, OrganizationView

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (2): AuditView, Table

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): CoursesView, StatusBadge

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): CourseActionButton, CourseTable

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (2): CourseCard, CourseListView

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): profiles, ta

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): course_created, courses

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (1): Import Course Instructors Script

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (1): Check Core RLS Script

### Community 126 - "Community 126"
Cohesion: 1.0
Nodes (1): Sentry Client Config

### Community 127 - "Community 127"
Cohesion: 1.0
Nodes (1): Session Proxy Middleware

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (1): Next.js Config

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (1): Navigation Items

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): Status Badge Classes

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): Repository Interfaces

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): Root Page

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): Root Layout

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): Dashboard Redirect Page

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (1): Dashboard Server Actions

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/error.tsx

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): DashboardError

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/layout.tsx

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (1): DashboardLayout

### Community 142 - "Community 142"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/admin/page.tsx

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (1): AdminDashboardPage

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (1): apps/web/app/(dashboard)/admin/actions.ts

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): requestFixesAction

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (1): AssignedCoursesTable

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): ReviewQueueTable

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (1): AdminQueuePage

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (1): AdminCourseDetailPage

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (1): CourseReviewDetail

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (1): TADashboardPage

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): SuperAdminDashboardPage

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (1): createUserAction

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (1): SuperAdminAuditPage

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (1): SuperAdminUsersPage

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (1): SuperAdminOrganizationPage

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (1): SuperAdminCoursesPage

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (1): CommunicationsDashboardPage

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (1): CoursesPage

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (1): CourseWorkspaceIndexPage

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (1): CourseWorkspaceLayout

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (1): IssueLogTable

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (1): SubmitPanel

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (1): ReviewMatrixForm

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (1): InfoPanel

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (1): IssueDrawer

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): IssueLogPage

### Community 168 - "Community 168"
Cohesion: 1.0
Nodes (1): SubmitPage

### Community 169 - "Community 169"
Cohesion: 1.0
Nodes (1): SyllabusGradebookPage

### Community 170 - "Community 170"
Cohesion: 1.0
Nodes (1): ReviewMatrixPage

### Community 171 - "Community 171"
Cohesion: 1.0
Nodes (1): GET_callback

### Community 172 - "Community 172"
Cohesion: 1.0
Nodes (1): LoginPage

### Community 173 - "Community 173"
Cohesion: 1.0
Nodes (1): DevRoleSwitcher

### Community 174 - "Community 174"
Cohesion: 1.0
Nodes (1): ErrorDisplay

### Community 175 - "Community 175"
Cohesion: 1.0
Nodes (1): TweakProvider

### Community 176 - "Community 176"
Cohesion: 1.0
Nodes (1): PaginationControls

### Community 177 - "Community 177"
Cohesion: 1.0
Nodes (1): Topbar

### Community 178 - "Community 178"
Cohesion: 1.0
Nodes (1): Sidebar

### Community 179 - "Community 179"
Cohesion: 1.0
Nodes (1): Avatar

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (1): Badge

### Community 181 - "Community 181"
Cohesion: 1.0
Nodes (1): Tabs

### Community 182 - "Community 182"
Cohesion: 1.0
Nodes (1): ScrollArea

### Community 183 - "Community 183"
Cohesion: 1.0
Nodes (1): Separator

### Community 184 - "Community 184"
Cohesion: 1.0
Nodes (1): Sheet

### Community 185 - "Community 185"
Cohesion: 1.0
Nodes (1): Input

### Community 186 - "Community 186"
Cohesion: 1.0
Nodes (1): Progress

### Community 187 - "Community 187"
Cohesion: 1.0
Nodes (1): Select

### Community 188 - "Community 188"
Cohesion: 1.0
Nodes (1): UsersView

### Community 189 - "Community 189"
Cohesion: 1.0
Nodes (1): OverviewView

### Community 190 - "Community 190"
Cohesion: 1.0
Nodes (1): course_assignments

### Community 191 - "Community 191"
Cohesion: 1.0
Nodes (1): organizational_units

### Community 192 - "Community 192"
Cohesion: 1.0
Nodes (1): super_admin

### Community 193 - "Community 193"
Cohesion: 1.0
Nodes (1): final_approved

## Knowledge Gaps
- **30 isolated node(s):** `Analyze LMS Hierarchy CSVs and prepare data for DB insertion.  Sources:   - ADs-`, `Both the first initial AND some part of the surname must appear in the email pre`, `Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'.`, `Workflow Roles Definition`, `Design Canvas Wrapper` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 19`** (4 nodes): `loadEnvFiles()`, `db-migrate-all.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `loadEnvFiles()`, `db-inspect.mjs`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `loadEnvFiles()`, `parseDatabaseUrl()`, `parseSupabaseDatabaseUrl()`, `apply-migration.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `updateSession()`, `middleware.ts`, `proxy.ts`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (2 nodes): `AdminAssignmentPanel`, `assignTaToCourseAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (2 nodes): `CourseChat`, `postCommentAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (2 nodes): `MetadataForm`, `MetadataPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (2 nodes): `InstructorCourseList`, `InstructorDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (2 nodes): `DepartmentMonitor`, `StatCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (2 nodes): `Card`, `OrganizationView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (2 nodes): `AuditView`, `Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (2 nodes): `CoursesView`, `StatusBadge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (2 nodes): `CourseActionButton`, `CourseTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (2 nodes): `CourseCard`, `CourseListView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (2 nodes): `profiles`, `ta`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (2 nodes): `course_created`, `courses`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (1 nodes): `Import Course Instructors Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `Check Core RLS Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `Sentry Client Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (1 nodes): `Session Proxy Middleware`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `Next.js Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `Navigation Items`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `Status Badge Classes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `Repository Interfaces`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `Root Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `Root Layout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `Dashboard Redirect Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `Dashboard Server Actions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `apps/web/app/(dashboard)/error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `DashboardError`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `apps/web/app/(dashboard)/layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `DashboardLayout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (1 nodes): `apps/web/app/(dashboard)/admin/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (1 nodes): `AdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (1 nodes): `apps/web/app/(dashboard)/admin/actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `requestFixesAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (1 nodes): `AssignedCoursesTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (1 nodes): `ReviewQueueTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (1 nodes): `AdminQueuePage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (1 nodes): `AdminCourseDetailPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (1 nodes): `CourseReviewDetail`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (1 nodes): `TADashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (1 nodes): `SuperAdminDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (1 nodes): `createUserAction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `SuperAdminAuditPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `SuperAdminUsersPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `SuperAdminOrganizationPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `SuperAdminCoursesPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `CommunicationsDashboardPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `CoursesPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (1 nodes): `CourseWorkspaceIndexPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (1 nodes): `CourseWorkspaceLayout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (1 nodes): `IssueLogTable`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `SubmitPanel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `ReviewMatrixForm`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `InfoPanel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (1 nodes): `IssueDrawer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (1 nodes): `IssueLogPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (1 nodes): `SubmitPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (1 nodes): `SyllabusGradebookPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (1 nodes): `ReviewMatrixPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `GET_callback`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `LoginPage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `DevRoleSwitcher`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `ErrorDisplay`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `TweakProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (1 nodes): `PaginationControls`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `Topbar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (1 nodes): `Sidebar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (1 nodes): `Avatar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (1 nodes): `Badge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 181`** (1 nodes): `Tabs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 182`** (1 nodes): `ScrollArea`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (1 nodes): `Separator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (1 nodes): `Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (1 nodes): `Input`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 186`** (1 nodes): `Progress`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 187`** (1 nodes): `Select`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 188`** (1 nodes): `UsersView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 189`** (1 nodes): `OverviewView`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 190`** (1 nodes): `course_assignments`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 191`** (1 nodes): `organizational_units`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 192`** (1 nodes): `super_admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (1 nodes): `final_approved`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAuthContext()` connect `Course Management and Auth Context` to `Authentication and Super Admin Actions`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `getProfileRepository()` connect `Authentication and Super Admin Actions` to `Course Management and Auth Context`, `Course Workflow and Services`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `requireProfile()` connect `Course Management and Auth Context` to `Authentication and Super Admin Actions`, `Course Workflow and Services`, `Course Comments and Chat`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `requireProfile()` (e.g. with `saveDraft()` and `submitReview()`) actually correct?**
  _`requireProfile()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `getCourseRepository()` (e.g. with `getAdminCourses()` and `getAdminCoursesPage()`) actually correct?**
  _`getCourseRepository()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getAuthContext()` (e.g. with `getAuthService()` and `getProfileRepository()`) actually correct?**
  _`getAuthContext()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `getProfileRepository()` (e.g. with `getAuthContext()` and `getSuperAdminData()`) actually correct?**
  _`getProfileRepository()` has 10 INFERRED edges - model-reasoned connections that need verification._