import "server-only";

import { getCourseStatusLabel, type CourseStatus, type Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";

type NotificationKind = "assignment" | "course_action" | "issue" | "comment" | "support";
type NotificationTone = "default" | "warning" | "danger" | "success";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  description: string;
  courseTitle: string | null;
  meta: string;
  href: string;
  createdAt: string;
  pending: boolean;
};

type CourseRow = {
  id: string;
  title: string;
  term: string | null;
  department: string | null;
  status: CourseStatus;
  updated_at: string;
  submission_count?: number;
};

type IssueRow = {
  id: string;
  course_id: string;
  title: string;
  type: string;
  severity: string;
  status: "open" | "in_review" | "resolved";
  created_at: string;
  updated_at: string;
  courses: { title: string | null } | { title: string | null }[] | null;
  created_by_profile: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null;
};

type CommentRow = {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
  course_issues:
    | {
        course_id: string;
        title: string | null;
        courses: { title: string | null } | { title: string | null }[] | null;
      }
    | Array<{
        course_id: string;
        title: string | null;
        courses: { title: string | null } | { title: string | null }[] | null;
      }>
    | null;
  author: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null;
};

type SupportMessageRow = {
  id: string;
  sender_role: string;
  type: "message" | "poke";
  subject: string | null;
  body: string;
  status: "open" | "read" | "resolved";
  created_at: string;
  sender: { full_name: string | null; role: string | null } | { full_name: string | null; role: string | null }[] | null;
};

type ReassignmentRow = {
  id: string;
  course_id: string;
  to_profile_id: string;
  created_at: string;
  courses: { title: string | null } | { title: string | null }[] | null;
  to_profile: { full_name: string | null } | { full_name: string | null }[] | null;
};

const ADMIN_ROLES: readonly Role[] = ["admin_full", "admin_viewer", "super_admin"];
const STAFF_PENDING_STATUSES = new Set<CourseStatus>([
  "assigned_to_ta",
  "ta_review_in_progress",
  "admin_changes_requested",
  "staging_in_progress",
]);
const INSTRUCTOR_PENDING_STATUSES = new Set<CourseStatus>([
  "sent_to_instructor",
  "instructor_questions",
]);
const ADMIN_PENDING_STATUSES = new Set<CourseStatus>([
  "course_created",
  "submitted_to_admin",
  "waiting_on_admin",
  "ready_for_instructor",
  "instructor_questions",
  "instructor_approved",
]);

/** Comments older than this window are informational, not "pending attention". */
const COMMENT_PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type NotificationsPageData = {
  notifications: NotificationItem[];
  pendingCount: number;
  role: Role;
  /** True when the data could not be loaded (e.g. a transient Supabase/network failure). */
  error: boolean;
};

export async function getNotificationsPageData(): Promise<NotificationsPageData> {
  const context = await requireProfile();
  const role = context.profile.role;
  const isAdmin = ADMIN_ROLES.includes(role);

  try {
    const accessibleCourseIds = isAdmin
      ? null
      : await getAssignedCourseIds(context.profile.id, role);

    if (accessibleCourseIds && accessibleCourseIds.length === 0) {
      return { notifications: [], pendingCount: 0, role, error: false };
    }

    const [courses, issues, comments, supportMessages, reassignments, dismissedIds, mentions] = await Promise.all([
      getRelevantCourses(accessibleCourseIds, role),
      getRelevantIssues(accessibleCourseIds),
      getRecentComments(accessibleCourseIds, context.profile.id),
      role === "super_admin" ? getOpenSupportMessages() : Promise.resolve([]),
      getRecentReassignments(context.profile.id, isAdmin),
      getDismissedIds(context.profile.id),
      getMentionNotifications(context.profile.id, role),
    ]);

    const notifications = [
      ...courses.map((course) => courseToNotification(course, role)),
      ...issues.map((issue) => issueToNotification(issue, role)),
      ...comments.map((comment) => commentToNotification(comment, role)),
      ...supportMessages.map(supportMessageToNotification),
      ...reassignments.map((r) => reassignmentToNotification(r, isAdmin)),
      ...mentions,
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((n) => !dismissedIds.has(n.id));

    return {
      notifications,
      pendingCount: notifications.filter((item) => item.pending).length,
      role,
      error: false,
    };
  } catch (err) {
    // A transient Supabase/network failure ("fetch failed") should degrade to an
    // empty state rather than crash the entire notifications page with a 500.
    console.error("Could not load notifications page data:", err);
    return { notifications: [], pendingCount: 0, role, error: true };
  }

  async function getAssignedCourseIds(profileId: string, profileRole: Role) {
    const assignmentRole = profileRole === "instructor" ? "instructor" : "staff";
    const pool = getPostgresPool();
    const { rows } = await pool.query<{ course_id: string }>(
      `SELECT course_id FROM course_assignments WHERE profile_id = $1 AND role = $2`,
      [profileId, assignmentRole],
    );
    return rows.map((row) => row.course_id);
  }
}

async function getRecentReassignments(
  forProfileId: string,
  isAdmin: boolean,
): Promise<ReassignmentRow[]> {
  const pool = getPostgresPool();
  const values: unknown[] = [];
  let whereSql = "";
  if (!isAdmin) {
    values.push(forProfileId);
    whereSql = `WHERE r.to_profile_id = $1`;
  }
  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    to_profile_id: string;
    created_at: string;
    course_title: string | null;
    to_full_name: string | null;
  }>(
    `
      SELECT r.id, r.course_id, r.to_profile_id, r.created_at,
             c.title AS course_title, p.full_name AS to_full_name
      FROM course_reassignments r
      LEFT JOIN courses c ON c.id = r.course_id
      LEFT JOIN profiles p ON p.id = r.to_profile_id
      ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT 50
    `,
    values,
  );
  return rows.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    to_profile_id: row.to_profile_id,
    created_at: row.created_at,
    courses: { title: row.course_title },
    to_profile: { full_name: row.to_full_name },
  }));
}

async function getOpenSupportMessages(): Promise<SupportMessageRow[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    id: string;
    sender_role: string;
    type: "message" | "poke";
    subject: string | null;
    body: string;
    status: "open" | "read" | "resolved";
    created_at: string;
    sender_full_name: string | null;
    sender_profile_role: string | null;
  }>(
    `
      SELECT s.id, s.sender_role, s.type, s.subject, s.body, s.status, s.created_at,
             p.full_name AS sender_full_name, p.role AS sender_profile_role
      FROM support_messages s
      LEFT JOIN profiles p ON p.id = s.sender_profile_id
      WHERE s.status <> 'resolved'
      ORDER BY s.created_at DESC
      LIMIT 50
    `,
  );
  return rows.map((row) => ({
    id: row.id,
    sender_role: row.sender_role,
    type: row.type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    sender: { full_name: row.sender_full_name, role: row.sender_profile_role },
  }));
}

async function getRelevantCourses(courseIds: string[] | null, role: Role): Promise<CourseRow[]> {
  const pendingStatuses = getPendingStatuses(role);
  const pool = getPostgresPool();
  const values: unknown[] = [pendingStatuses];
  let courseFilter = "";
  if (courseIds) {
    values.push(courseIds);
    courseFilter = `AND id = ANY($${values.length}::uuid[])`;
  }
  const { rows } = await pool.query<CourseRow>(
    `
      SELECT id, title, term, department, status, updated_at
      FROM courses
      WHERE status = ANY($1::text[]) ${courseFilter}
      ORDER BY updated_at DESC
      LIMIT 100
    `,
    values,
  );
  const courses = rows as CourseRow[];

  const submittedIds = courses.filter((c) => c.status === "submitted_to_admin").map((c) => c.id);
  if (submittedIds.length > 0) {
    const { rows: events } = await pool.query<{ course_id: string }>(
      `SELECT course_id FROM course_status_events WHERE course_id = ANY($1::uuid[]) AND to_status = 'submitted_to_admin'`,
      [submittedIds],
    );
    const countMap = new Map<string, number>();
    for (const ev of events) countMap.set(ev.course_id, (countMap.get(ev.course_id) ?? 0) + 1);
    for (const course of courses) {
      if (countMap.has(course.id)) course.submission_count = countMap.get(course.id);
    }
  }
  return courses;
}

async function getRelevantIssues(courseIds: string[] | null): Promise<IssueRow[]> {
  const pool = getPostgresPool();
  const values: unknown[] = [];
  let courseFilter = "";
  if (courseIds) {
    values.push(courseIds);
    courseFilter = `WHERE i.course_id = ANY($${values.length}::uuid[])`;
  }
  const { rows } = await pool.query<{
    id: string;
    course_id: string;
    title: string;
    type: string;
    severity: string;
    status: "open" | "in_review" | "resolved";
    created_at: string;
    updated_at: string;
    course_title: string | null;
    cb_full_name: string | null;
    cb_role: string | null;
  }>(
    `
      SELECT i.id, i.course_id, i.title, i.type, i.severity, i.status, i.created_at, i.updated_at,
             c.title AS course_title,
             p.full_name AS cb_full_name, p.role AS cb_role
      FROM course_issues i
      LEFT JOIN courses c ON c.id = i.course_id
      LEFT JOIN profiles p ON p.id = i.created_by
      ${courseFilter}
      ORDER BY i.updated_at DESC
      LIMIT 125
    `,
    values,
  );
  return rows.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    title: row.title,
    type: row.type,
    severity: row.severity,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    courses: { title: row.course_title },
    created_by_profile: { full_name: row.cb_full_name, role: row.cb_role },
  }));
}

async function getRecentComments(courseIds: string[] | null, currentUserId: string): Promise<CommentRow[]> {
  const pool = getPostgresPool();
  const values: unknown[] = [currentUserId];
  let courseFilter = "";
  if (courseIds) {
    values.push(courseIds);
    courseFilter = `AND i.course_id = ANY($${values.length}::uuid[])`;
  }
  const { rows } = await pool.query<{
    id: string;
    issue_id: string;
    author_id: string;
    body: string;
    created_at: string;
    course_id: string;
    issue_title: string | null;
    course_title: string | null;
    author_full_name: string | null;
    author_role: string | null;
  }>(
    `
      SELECT c.id, c.issue_id, c.author_id, c.body, c.created_at,
             i.course_id, i.title AS issue_title, crs.title AS course_title,
             p.full_name AS author_full_name, p.role AS author_role
      FROM course_issue_comments c
      INNER JOIN course_issues i ON i.id = c.issue_id
      LEFT JOIN courses crs ON crs.id = i.course_id
      LEFT JOIN profiles p ON p.id = c.author_id
      WHERE c.is_system_message = false AND c.author_id <> $1 ${courseFilter}
      ORDER BY c.created_at DESC
      LIMIT 25
    `,
    values,
  );
  return rows.map((row) => ({
    id: row.id,
    issue_id: row.issue_id,
    author_id: row.author_id,
    body: row.body,
    created_at: row.created_at,
    course_issues: {
      course_id: row.course_id,
      title: row.issue_title,
      courses: { title: row.course_title },
    },
    author: { full_name: row.author_full_name, role: row.author_role },
  }));
}

function formatAuthorName(fullName: string | null | undefined, role: string | null | undefined): string {
  if (fullName && fullName.trim() !== "") return fullName;
  if (role) {
    if (role === "standard_user") return "Staff Member";
    if (role === "super_admin" || role === "admin_full") return "Administrator";
    if (role === "admin_viewer") return "Viewer";
    if (role === "instructor") return "Instructor";
  }
  return "Team Member";
}

function courseToNotification(course: CourseRow, role: Role): NotificationItem {
  const label = getCourseStatusLabel(course.status);
  const action = getCourseActionLabel(course.status, role, course.submission_count);

  let tone: NotificationTone = "default";
  if (course.status === "admin_changes_requested" || course.status === "instructor_questions") {
    tone = "warning";
  } else if (course.status === "final_approved" || course.status === "instructor_approved" || course.status === "ready_for_instructor") {
    tone = "success";
  }

  // ready_for_instructor is informational for everyone EXCEPT admins, who must
  // act on it (send the finalized staging to the instructor) — so it's pending
  // for them, in step with ADMIN_PENDING_STATUSES.
  const adminMustSend = course.status === "ready_for_instructor" && ADMIN_ROLES.includes(role);

  return {
    id: `course-${course.id}-${course.status}`,
    kind: "course_action",
    tone,
    title: action,
    description: `${course.title} is currently ${label.toLowerCase()}.`,
    courseTitle: course.title,
    meta: [label, course.department, course.term].filter(Boolean).join(" · "),
    href: getCourseHref(course.id, role),
    createdAt: course.updated_at,
    pending:
      adminMustSend ||
      (course.status !== "final_approved" &&
        course.status !== "instructor_approved" &&
        course.status !== "ready_for_instructor"),
  };
}

function issueToNotification(issue: IssueRow, role: Role): NotificationItem {
  const courseTitle = firstRelation(issue.courses)?.title ?? null;
  const authorProfile = firstRelation(issue.created_by_profile);
  const authorName = formatAuthorName(authorProfile?.full_name, authorProfile?.role);

  let tone: NotificationTone = "warning";
  if (issue.status === "resolved") {
    tone = "success";
  } else if (issue.severity === "critical") {
    tone = "danger";
  }

  return {
    id: `issue-${issue.id}`,
    kind: "issue",
    tone,
    title: issue.title,
    description: `${formatIssueType(issue.type)} opened by ${authorName}.`,
    courseTitle,
    meta: `${formatSeverity(issue.severity)} · ${formatIssueStatus(issue.status)}`,
    href: getIssueHref(issue.course_id, role),
    createdAt: issue.updated_at ?? issue.created_at,
    pending: issue.status !== "resolved",
  };
}

function commentToNotification(comment: CommentRow, role: Role): NotificationItem {
  const issue = firstRelation(comment.course_issues);
  const courseTitle = firstRelation(issue?.courses)?.title ?? null;
  const authorProfile = firstRelation(comment.author);
  const authorName = formatAuthorName(authorProfile?.full_name, authorProfile?.role);
  const preview = comment.body.length > 120 ? `${comment.body.slice(0, 120)}...` : comment.body;

  return {
    id: `comment-${comment.id}`,
    kind: "comment",
    tone: "default",
    title: `New comment on ${issue?.title ?? "an issue"}`,
    description: preview,
    courseTitle,
    meta: `By ${authorName}`,
    href: getIssueHref(issue?.course_id ?? "", role),
    createdAt: comment.created_at,
    pending: Date.now() - Date.parse(comment.created_at) < COMMENT_PENDING_WINDOW_MS,
  };
}

function supportMessageToNotification(message: SupportMessageRow): NotificationItem {
  const senderProfile = firstRelation(message.sender);
  const senderName = formatAuthorName(senderProfile?.full_name, senderProfile?.role ?? message.sender_role);
  const preview = message.body.length > 120 ? message.body.slice(0, 120) + "..." : message.body;
  const isPoke = message.type === "poke";

  return {
    id: "support-" + message.id,
    kind: "support",
    tone: isPoke ? "warning" : "default",
    title: isPoke ? "IT support poke" : message.subject ?? "New support message",
    description: isPoke ? senderName + " poked IT support." : preview,
    courseTitle: null,
    meta: "By " + senderName + " · " + formatIssueStatus(message.status),
    href: "/notifications",
    createdAt: message.created_at,
    pending: message.status !== "resolved",
  };
}

function reassignmentToNotification(row: ReassignmentRow, viewerIsAdmin: boolean): NotificationItem {
  const courseTitle = firstRelation(row.courses)?.title ?? null;
  const toName = firstRelation(row.to_profile)?.full_name ?? "a TA";
  return {
    id: `reassign-${row.id}`,
    kind: "assignment",
    tone: viewerIsAdmin ? "default" : "success",
    title: viewerIsAdmin
      ? `Course reassigned to ${toName}`
      : `You've been assigned ${courseTitle ?? "a course"}`,
    description: viewerIsAdmin
      ? `${courseTitle ?? "A course"} was reassigned to ${toName}.`
      : `${courseTitle ?? "A course"} was reassigned to you. Open it when you're ready.`,
    courseTitle,
    meta: "Reassignment",
    href: viewerIsAdmin ? `/admin/courses/${row.course_id}` : `/courses/${row.course_id}/metadata`,
    createdAt: row.created_at,
    pending: !viewerIsAdmin, // actionable for the new TA, informational for admins
  };
}

function getPendingStatuses(role: Role): CourseStatus[] {
  if (role === "standard_user") return Array.from(STAFF_PENDING_STATUSES);
  if (role === "instructor") return Array.from(INSTRUCTOR_PENDING_STATUSES);
  if (ADMIN_ROLES.includes(role)) return Array.from(ADMIN_PENDING_STATUSES);
  return [];
}

function getCourseActionLabel(status: CourseStatus, role: Role, submissionCount?: number) {
  if (status === "course_created") return "Course needs staff assignment";
  if (status === "submitted_to_admin") {
    return submissionCount && submissionCount > 1
      ? "Course resubmitted by TA"
      : "Course is ready for admin review";
  }
  if (status === "instructor_approved") return "Course is ready for final approval";
  if (status === "ready_for_instructor") return "Staging finalized — send to instructor";
  if (status === "sent_to_instructor") return "Course is waiting for instructor review";
  if (status === "instructor_questions") return role === "instructor" ? "Questions need follow-up" : "Instructor questions need review";
  if (status === "admin_changes_requested") return "Changes were requested";
  return "Course needs attention";
}

function getCourseHref(courseId: string, role: Role) {
  if (ADMIN_ROLES.includes(role)) return `/admin/courses/${courseId}`;
  if (role === "instructor") return "/instructor";
  return `/courses/${courseId}/metadata`;
}

function getIssueHref(courseId: string, role: Role) {
  if (!courseId) return "/notifications";
  if (ADMIN_ROLES.includes(role)) return `/admin/courses/${courseId}`;
  return `/courses/${courseId}/issue-log`;
}

function formatIssueType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSeverity(severity: string) {
  return `${severity.charAt(0).toUpperCase()}${severity.slice(1)} severity`;
}

function formatIssueStatus(status: string) {
  return status.replace(/_/g, " ");
}

async function getDismissedIds(userId: string): Promise<Set<string>> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ notification_id: string }>(
    `SELECT notification_id FROM dismissed_notifications WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.notification_id));
}

async function getMentionNotifications(
  profileId: string,
  role: Role,
): Promise<NotificationItem[]> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{
    comment_id: string;
    issue_id: string;
    body: string;
    course_id: string;
    issue_title: string | null;
    author_name: string | null;
    created_at: string;
  }>(
    `
      SELECT
        m.comment_id,
        c.issue_id,
        c.body,
        i.course_id,
        i.title AS issue_title,
        p.full_name AS author_name,
        c.created_at
      FROM issue_comment_mentions m
      JOIN course_issue_comments c ON c.id = m.comment_id
      JOIN course_issues i        ON i.id = c.issue_id
      LEFT JOIN profiles p        ON p.id = c.author_id
      WHERE m.mentioned_profile_id = $1
        AND c.is_system_message = false
      ORDER BY c.created_at DESC
      LIMIT 25
    `,
    [profileId],
  );

  return rows.map((row) => {
    const preview = row.body.length > 120 ? `${row.body.slice(0, 120)}...` : row.body;
    const authorName = row.author_name ?? "Team Member";
    return {
      id: `mention-${row.comment_id}`,
      kind: "comment" as const,
      tone: "default" as const,
      title: `You were mentioned in a comment on "${row.issue_title ?? "an issue"}"`,
      description: preview,
      courseTitle: null,
      meta: `By ${authorName}`,
      href: getIssueHref(row.course_id, role),
      createdAt: row.created_at,
      pending: Date.now() - Date.parse(row.created_at) < COMMENT_PENDING_WINDOW_MS,
    };
  });
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
