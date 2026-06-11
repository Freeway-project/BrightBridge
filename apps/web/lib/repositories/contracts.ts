import type { AssignmentRole, CourseStatus, Role } from "@coursebridge/workflow";

export type AppProfileRecord = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

export type ProfileOption = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

export type UserSummary = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  createdAt: string;
};

export type SectionProgress = {
  exists: boolean;
  status: "draft" | "submitted" | null;
  responseData: Record<string, unknown> | null;
};

export type ReviewProgress = {
  courseMetadata: SectionProgress;
  reviewMatrix: SectionProgress;
  syllabusReview: SectionProgress;
};

export type CourseSummary = {
  id: string;
  sourceCourseId: string | null;
  targetCourseId: string | null;
  title: string;
  term: string | null;
  department: string | null;
  orgUnitId: string | null;
  status: CourseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Assigned reviewer (course_assignments role "staff"). Populated by list queries that join assignments. */
  ta?: { name: string | null; email: string } | null;
  /** Assigned instructor (course_assignments role "instructor"). */
  instructor?: { name: string | null; email: string } | null;
  reviewProgress?: ReviewProgress;
};

export type AssignedCourse = {
  id: string;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  created_at: string;
};

export type InstructorCourse = {
  id: string;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  updatedAt: string;
};

export type AdminCourseRow = {
  id: string;
  sourceCourseId: string | null;
  targetCourseId: string | null;
  title: string;
  term: string | null;
  department: string | null;
  orgUnitId: string | null;
  status: CourseStatus;
  updatedAt: string;
  ta: { id: string; name: string | null; email: string } | null;
  /** Assigned instructor — populated by getAdminCourse (single-course read), not list queries. */
  instructor?: { id: string; name: string | null; email: string } | null;
  instructorSummaryNotes: string | null;
  reviewProgress?: ReviewProgress;
};

export type AdminCourseListFilters = {
  search?: string;
  status?: CourseStatus;
  /** Filter to any of these statuses (whole-phase filter). Takes precedence over `status`. */
  statuses?: readonly CourseStatus[];
  taProfileId?: string;
  assignedOnly?: boolean;
};

export type AssignedCourseListFilters = {
  statuses?: readonly CourseStatus[];
};

export type UnitCourseListFilters = {
  search?: string;
  status?: CourseStatus;
  term?: string;
};

export type SuperAdminCourseRow = {
  id: string;
  code: string | null;
  title: string;
  status: CourseStatus;
  term: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
  ta: { name: string | null; email: string } | null;
  instructor: { name: string | null; email: string } | null;
};

export type StatusCount = {
  status: CourseStatus;
  count: number;
};

export type UnitCourseFacets = {
  /** Status breakdown over the unit's whole subtree (unfiltered). */
  statusCounts: StatusCount[];
  /** Distinct, non-empty course terms in the subtree (for the term filter). */
  terms: string[];
  /** Total courses in the subtree. */
  total: number;
};

export type StuckCourse = {
  id: string;
  title: string;
  status: CourseStatus;
  days_stuck: number;
  updated_at: string;
};

export type TAWorkload = {
  id: string;
  full_name: string | null;
  email: string;
  active_courses: number;
  needs_fixes: number;
};

export type AuditEvent = {
  id: string;
  course_id: string;
  course_title: string;
  from_status: string | null;
  to_status: string;
  kind: "transition" | "admin_override";
  actor_name: string | null;
  actor_email: string;
  actor_role: string;
  /** Name of the instructor this transition was performed on behalf of (delegation), if any. */
  on_behalf_of_name: string | null;
  note: string | null;
  created_at: string;
};

/**
 * A normalized entry from the generic `audit_log` table, used to surface the
 * activity that course_status_events / issues / comments don't already cover
 * (assignments, escalations, escalation messages, issue comments). Profile ids
 * are pre-resolved to display names by the repository. The repository returns
 * an empty list if the audit_log table/migration isn't present yet — it never
 * throws into the timeline.
 */
export type CourseAuditEntry = {
  id: string;
  tableName:
    | "course_assignments"
    | "course_escalations"
    | "escalation_messages"
    | "course_issue_comments";
  action: "INSERT" | "UPDATE" | "DELETE" | "BACKFILL";
  at: string;
  actorName: string | null;
  role: string | null; // assignment role
  targetName: string | null; // who was assigned
  title: string | null; // escalation title
  body: string | null; // message / comment body
  status: string | null; // escalation status (e.g. on resolve)
  isSystem: boolean; // system-generated issue comment
};

export type SuperAdminData = {
  courses: SuperAdminCourseRow[];
  users: UserSummary[];
  statusCounts: StatusCount[];
  stuckCourses: StuckCourse[];
  taWorkload: TAWorkload[];
  auditEvents: AuditEvent[];
};

export type ReviewSection = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type ReviewResponse = {
  id: string;
  course_id: string;
  section_id: string;
  responded_by: string;
  response_data: Record<string, unknown>;
  status: "draft" | "submitted";
  updated_at: string;
};

export type CourseComment = {
  id: string;
  course_id: string;
  author_id: string;
  author_name?: string;
  author_role?: string;
  author_email?: string;
  /** Author's highest org-hierarchy leadership title (e.g. "dean"), when they hold one. */
  author_title?: string | null;
  /** Raw profile id this comment was posted on behalf of (delegation). */
  acting_on_behalf_of?: string | null;
  /** Display name of the instructor this comment was posted on behalf of, when delegated. */
  on_behalf_of_name?: string | null;
  body: string;
  visibility: "internal" | "instructor_visible";
  parent_comment_id: string | null;
  created_at: string;
};

export type CourseAssignmentRecord = {
  profileId: string;
  courseId: string;
  role: AssignmentRole;
};

export type OrgUnit = {
  id: string;
  parentId: string | null;
  name: string;
  type: string;
};

export type OrgUnitMember = {
  id: string;
  profileId: string;
  orgUnitId: string;
  title: string;
  isPrimary: boolean;
};

export type CreateCourseRecordInput = {
  sourceCourseId?: string | null;
  targetCourseId?: string | null;
  title: string;
  term?: string | null;
  department?: string | null;
  orgUnitId?: string | null;
  status: CourseStatus;
  createdBy: string;
};

export type AssignUserToCourseRecordInput = {
  courseId: string;
  profileId: string;
  role: AssignmentRole;
  assignedBy: string;
};

export type ReassignCourseStaffRecordInput = {
  courseId: string;
  newProfileId: string;
  actorId: string;
  reason: string | null;
};

export type InsertStatusEventInput = {
  courseId: string;
  fromStatus: CourseStatus | null;
  toStatus: CourseStatus;
  actorId: string;
  actorRole: Role;
  note?: string | null;
  /** Set when a hierarchy leader performed this transition on behalf of the assigned instructor. */
  actingOnBehalfOf?: string | null;
};

export type PostCourseCommentInput = {
  courseId: string;
  authorId: string;
  body: string;
  visibility?: "internal" | "instructor_visible";
  parentCommentId?: string | null;
  /** Set when a hierarchy leader posted on behalf of the assigned instructor. */
  actingOnBehalfOf?: string | null;
};

export type UpsertReviewResponseInput = {
  courseId: string;
  sectionId: string;
  userId: string;
  responseData: Record<string, unknown>;
  status?: "draft" | "submitted";
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SubmissionEvent = {
  id: string;
  actorName: string | null;
  actorEmail: string;
  note: string | null;
  createdAt: string;
};

export type AssignmentLog = {
  id: string;
  courseId: string;
  courseTitle: string;
  assignedUser: { name: string | null; email: string };
  role: AssignmentRole;
  assignedBy: { name: string | null; email: string };
  assignedAt: string;
};

export interface CourseRepository {
  listAccessibleCourses(): Promise<CourseSummary[]>;
  listAssignedCourses(
    userId: string,
    assignmentRole: AssignmentRole,
    filters?: AssignedCourseListFilters,
  ): Promise<CourseSummary[]>;
  getAssignedCourseById(
    courseId: string,
    userId: string,
    assignmentRole: AssignmentRole,
  ): Promise<CourseSummary | null>;
  createCourse(input: CreateCourseRecordInput): Promise<CourseSummary>;
  getCourseSummaryById(courseId: string): Promise<CourseSummary>;
  updateCourseStatus(courseId: string, status: CourseStatus): Promise<CourseSummary>;
  updateCourseOrgUnit(courseId: string, orgUnitId: string | null): Promise<void>;
  getCourseAssignment(courseId: string, profileId: string): Promise<CourseAssignmentRecord | null>;
  hasAssignment(courseId: string, profileId: string, role: AssignmentRole): Promise<boolean>;
  assignUserToCourse(input: AssignUserToCourseRecordInput): Promise<void>;
  reassignCourseStaff(input: ReassignCourseStaffRecordInput): Promise<void>;
  insertStatusEvent(input: InsertStatusEventInput): Promise<void>;
  listAdminCourses(): Promise<AdminCourseRow[]>;
  listAdminCoursesPage(
    page?: number,
    pageSize?: number,
    filters?: AdminCourseListFilters,
  ): Promise<PaginatedResult<AdminCourseRow>>;
  getAdminCourse(courseId: string): Promise<AdminCourseRow | null>;
  listSuperAdminCourses(page?: number, pageSize?: number, search?: string): Promise<PaginatedResult<SuperAdminCourseRow>>;
  countCourses(): Promise<number>;
  listStatusCounts(): Promise<StatusCount[]>;
  listStuckCourses(cutoffIso: string): Promise<StuckCourse[]>;
  listTAWorkload(): Promise<TAWorkload[]>;
  listAuditEvents(limit: number): Promise<AuditEvent[]>;
  listAuditEventsPage(page: number, pageSize: number): Promise<PaginatedResult<AuditEvent>>;
  listCourseStatusEvents(courseId: string): Promise<AuditEvent[]>;
  listCourseAuditEntries(courseId: string): Promise<CourseAuditEntry[]>;
  listSubmissionHistory(courseId: string): Promise<SubmissionEvent[]>;
  listChangeRequestHistory(courseId: string): Promise<SubmissionEvent[]>;
  listQuestionRoundHistory(courseId: string): Promise<SubmissionEvent[]>;
  listRecentAssignments(limit: number): Promise<AssignmentLog[]>;
  listCoursesByUnitAncestry(unitIds: string[]): Promise<CourseSummary[]>;
  /** Paginated courses across a unit's whole subtree, with search/status/term filters. */
  listCoursesByUnit(
    unitId: string,
    page?: number,
    pageSize?: number,
    filters?: UnitCourseListFilters,
  ): Promise<PaginatedResult<AdminCourseRow>>;
  /** Status breakdown + distinct terms + total over a unit's subtree (drives KPIs/term filter). */
  getUnitCourseFacets(unitId: string): Promise<UnitCourseFacets>;
  /** Subtree course count for each of the given (sibling) child units, keyed by unit id. */
  getChildUnitCourseCounts(childUnitIds: string[]): Promise<Record<string, number>>;
  listInstructorCourses(profileId: string): Promise<InstructorCourse[]>;
}

export interface ProfileRepository {
  getProfileById(profileId: string): Promise<AppProfileRecord | null>;
  getProfilesByRole(role: Role): Promise<ProfileOption[]>;
  listUsers(page?: number, pageSize?: number, search?: string): Promise<PaginatedResult<UserSummary>>;
  upsertProfile(input: {
    id: string;
    email: string;
    fullName: string | null;
    role: Role;
  }): Promise<void>;
  updateProfileRole(profileId: string, role: Role): Promise<void>;
}

export interface ReviewRepository {
  getReviewSectionByKey(key: string): Promise<ReviewSection | null>;
  listReviewResponses(courseId: string): Promise<ReviewResponse[]>;
  getReviewResponse(courseId: string, sectionId: string): Promise<ReviewResponse | null>;
  upsertReviewResponse(input: UpsertReviewResponseInput): Promise<ReviewResponse>;
  markAllResponsesSubmitted(courseId: string): Promise<void>;
  getReviewProgressForCourses(courseIds: string[]): Promise<Map<string, ReviewProgress>>;
  getSectionKeyById(): Promise<Record<string, string>>;
}

export interface CommentRepository {
  listCourseComments(courseId: string, visibility?: "internal" | "instructor_visible"): Promise<CourseComment[]>;
  postCourseComment(input: PostCourseCommentInput): Promise<CourseComment>;
}

// ── Escalations ──────────────────────────────────────────────────────────────

export type EscalationSeverity = "minor" | "major" | "critical";
export type EscalationStatus = "open" | "resolved";

export type CourseEscalation = {
  id: string;
  course_id: string;
  created_by: string;
  severity: EscalationSeverity;
  title: string;
  status: EscalationStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  author_name?: string;
  author_email?: string;
  resolutionNote?: string | null;
};

export type EscalationMessage = {
  id: string;
  escalation_id: string;
  author_id: string;
  author_name?: string;
  author_email?: string;
  body: string;
  created_at: string;
};

export type EscalationWithMessages = CourseEscalation & {
  messages: EscalationMessage[];
};

export type OpenEscalationRow = CourseEscalation & {
  course_title: string;
  course_source_id: string | null;
  latest_message: string | null;
  latest_message_at: string | null;
};

export type CreateEscalationInput = {
  courseId: string;
  createdBy: string;
  severity: EscalationSeverity;
  title: string;
  firstMessage: string;
};

export interface EscalationRepository {
  getEscalationsForCourse(courseId: string): Promise<EscalationWithMessages[]>;
  getOpenEscalations(): Promise<OpenEscalationRow[]>;
  createEscalation(input: CreateEscalationInput): Promise<EscalationWithMessages>;
  addMessage(escalationId: string, authorId: string, body: string): Promise<EscalationMessage>;
  resolveEscalation(escalationId: string, resolvedBy: string, resolutionNote?: string): Promise<void>;
  countOpenEscalations(): Promise<number>;
}

export interface HierarchyRepository {
  listUnits(): Promise<OrgUnit[]>;
  getUnitById(id: string): Promise<OrgUnit | null>;
  getUserUnits(profileId: string): Promise<OrgUnitMember[]>;
  listAllMembers(): Promise<OrgUnitMember[]>;
  hasHierarchyAccess(profileId: string, courseId: string): Promise<boolean>;
  createUnit(input: { name: string; type: string; parentId?: string | null }): Promise<OrgUnit>;
  addMember(input: { profileId: string; orgUnitId: string; title: string; isPrimary?: boolean }): Promise<void>;
  removeMember(memberId: string): Promise<void>;
}
