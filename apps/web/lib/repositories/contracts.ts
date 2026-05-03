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
  status: CourseStatus;
  updatedAt: string;
  ta: { id: string; name: string | null; email: string } | null;
  reviewProgress?: ReviewProgress;
};

export type AdminCourseListFilters = {
  search?: string;
  status?: CourseStatus;
  taProfileId?: string;
  assignedOnly?: boolean;
};

export type SuperAdminCourseRow = {
  id: string;
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
  actor_name: string | null;
  actor_email: string;
  actor_role: string;
  note: string | null;
  created_at: string;
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

export type InsertStatusEventInput = {
  courseId: string;
  fromStatus: CourseStatus | null;
  toStatus: CourseStatus;
  actorId: string;
  actorRole: Role;
  note?: string | null;
};

export type PostCourseCommentInput = {
  courseId: string;
  authorId: string;
  body: string;
  visibility?: "internal" | "instructor_visible";
  parentCommentId?: string | null;
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

export interface CourseRepository {
  listAccessibleCourses(): Promise<CourseSummary[]>;
  listAssignedCourses(userId: string): Promise<CourseSummary[]>;
  getAssignedCourseById(courseId: string, userId: string): Promise<CourseSummary | null>;
  createCourse(input: CreateCourseRecordInput): Promise<CourseSummary>;
  getCourseSummaryById(courseId: string): Promise<CourseSummary>;
  updateCourseStatus(courseId: string, status: CourseStatus): Promise<CourseSummary>;
  getCourseAssignment(courseId: string, profileId: string): Promise<CourseAssignmentRecord | null>;
  hasAssignment(courseId: string, profileId: string, role: AssignmentRole): Promise<boolean>;
  assignUserToCourse(input: AssignUserToCourseRecordInput): Promise<void>;
  insertStatusEvent(input: InsertStatusEventInput): Promise<void>;
  listAdminCourses(): Promise<AdminCourseRow[]>;
  listAdminCoursesPage(
    page?: number,
    pageSize?: number,
    filters?: AdminCourseListFilters,
  ): Promise<PaginatedResult<AdminCourseRow>>;
  getAdminCourse(courseId: string): Promise<AdminCourseRow | null>;
  listSuperAdminCourses(page?: number, pageSize?: number, search?: string): Promise<PaginatedResult<SuperAdminCourseRow>>;
  listStatusCounts(): Promise<StatusCount[]>;
  listStuckCourses(cutoffIso: string): Promise<StuckCourse[]>;
  listTAWorkload(): Promise<TAWorkload[]>;
  listAuditEvents(limit: number): Promise<AuditEvent[]>;
  listCoursesByUnitAncestry(unitIds: string[]): Promise<CourseSummary[]>;
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
  listCourseComments(courseId: string): Promise<CourseComment[]>;
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
  resolveEscalation(escalationId: string, resolvedBy: string): Promise<void>;
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
