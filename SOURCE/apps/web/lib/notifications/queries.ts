import "server-only";

import { getCourseStatusLabel, type CourseStatus, type Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";

type NotificationKind = "assignment" | "course_action" | "issue" | "comment";
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
  course_title: string | null;
  created_by_full_name: string | null;
  created_by_role: string | null;
};

type CommentRow = {
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
};

const ADMIN_ROLES: readonly Role[] = ["admin_full", "admin_viewer", "super_admin"];
const STAFF_PENDING_STATUSES = new Set<CourseStatus>([
  "assigned_to_ta",
  "ta_review_in_progress",
  "admin_changes_requested",
]);
const INSTRUCTOR_PENDING_STATUSES = new Set<CourseStatus>([
  "sent_to_instructor",
  "instructor_questions",
]);
const ADMIN_PENDING_STATUSES = new Set<CourseStatus>([
  "course_created",
  "submitted_to_admin",
  "instructor_questions",
  "instructor_approved",
]);

export async function getNotificationsPageData() {
  const context = await requireProfile();
  const pool = getPostgresPool();
  const role = context.profile.role;
  const isAdmin = ADMIN_ROLES.includes(role);

  const accessibleCourseIds = isAdmin
    ? null
    : await getAssignedCourseIds(context.profile.id, role);

  if (accessibleCourseIds && accessibleCourseIds.length === 0) {
    return {
      notifications: [] as NotificationItem[],
      pendingCount: 0,
      role,
    };
  }

  const [courses, issues, comments] = await Promise.all([
    getRelevantCourses(accessibleCourseIds, role),
    getRelevantIssues(accessibleCourseIds),
    getRecentComments(accessibleCourseIds, context.profile.id),
  ]);

  const notifications = [
    ...courses.map((course) => courseToNotification(course, role)),
    ...issues.map((issue) => issueToNotification(issue, role)),
    ...comments.map((comment) => commentToNotification(comment, role)),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    notifications,
    pendingCount: notifications.filter((item) => item.pending).length,
    role,
  };

  async function getAssignedCourseIds(profileId: string, profileRole: Role) {
    const assignmentRole = profileRole === "instructor" ? "instructor" : "staff";
    const { rows } = await pool.query<{ course_id: string }>(
      `
        SELECT course_id
        FROM course_assignments
        WHERE profile_id = $1
          AND role = $2
      `,
      [profileId, assignmentRole],
    );

    return rows.map((row) => row.course_id);
  }
}

async function getRelevantCourses(courseIds: string[] | null, role: Role): Promise<CourseRow[]> {
  const pool = getPostgresPool();
  const pendingStatuses = getPendingStatuses(role);

  if (pendingStatuses.length === 0) {
    return [];
  }

  const whereClauses = ["c.status::text = ANY($1::text[])"];
  const params: Array<string[] | string | number> = [pendingStatuses];

  if (courseIds) {
    params.push(courseIds);
    whereClauses.push(`c.id = ANY($${params.length}::uuid[])`);
  }

  const { rows } = await pool.query<CourseRow>(
    `
      SELECT c.id, c.title, c.term, c.department, c.status, c.updated_at
      FROM courses c
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY c.updated_at DESC
      LIMIT 100
    `,
    params,
  );

  const courses = rows;

  // For submitted_to_admin courses, count how many times each was submitted
  const submittedIds = courses
    .filter((c) => c.status === "submitted_to_admin")
    .map((c) => c.id);

  if (submittedIds.length > 0) {
    const { rows: events } = await pool.query<{ course_id: string; submission_count: string }>(
      `
        SELECT course_id, COUNT(*)::text AS submission_count
        FROM course_status_events
        WHERE course_id = ANY($1::uuid[])
          AND to_status = 'submitted_to_admin'
        GROUP BY course_id
      `,
      [submittedIds],
    );

    const countMap = new Map<string, number>();
    for (const ev of events) {
      countMap.set(ev.course_id, Number(ev.submission_count));
    }
    for (const course of courses) {
      if (countMap.has(course.id)) {
        course.submission_count = countMap.get(course.id);
      }
    }
  }

  return courses;
}

async function getRelevantIssues(courseIds: string[] | null): Promise<IssueRow[]> {
  const pool = getPostgresPool();
  if (!(await tableExists("course_issues"))) {
    return [];
  }
  const params: Array<string[] | string> = [];
  const where: string[] = [];

  if (courseIds) {
    params.push(courseIds);
    where.push(`i.course_id = ANY($${params.length}::uuid[])`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query<IssueRow>(
      `
        SELECT
          i.id,
          i.course_id,
          i.title,
          i.type,
          i.severity,
          i.status,
          i.created_at,
          i.updated_at,
          c.title AS course_title,
          p.full_name AS created_by_full_name,
          p.role AS created_by_role
        FROM course_issues i
        LEFT JOIN courses c ON c.id = i.course_id
        LEFT JOIN profiles p ON p.id = i.created_by
        ${whereSql}
        ORDER BY i.updated_at DESC
        LIMIT 125
      `,
      params,
    );

    return rows;
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return [];
    }
    throw error;
  }
}

async function getRecentComments(courseIds: string[] | null, currentUserId: string): Promise<CommentRow[]> {
  const pool = getPostgresPool();
  const hasIssueComments = await tableExists("course_issue_comments");
  const hasCourseIssues = await tableExists("course_issues");
  if (!hasIssueComments || !hasCourseIssues) {
    return [];
  }
  const params: Array<string[] | string> = [currentUserId];
  const where: string[] = [
    "cic.is_system_message = false",
    "cic.author_id <> $1",
  ];

  if (courseIds) {
    params.push(courseIds);
    where.push(`ci.course_id = ANY($${params.length}::uuid[])`);
  }

  try {
    const { rows } = await pool.query<CommentRow>(
      `
        SELECT
          cic.id,
          cic.issue_id,
          cic.author_id,
          cic.body,
          cic.created_at,
          ci.course_id,
          ci.title AS issue_title,
          c.title AS course_title,
          p.full_name AS author_full_name,
          p.role AS author_role
        FROM course_issue_comments cic
        INNER JOIN course_issues ci ON ci.id = cic.issue_id
        LEFT JOIN courses c ON c.id = ci.course_id
        LEFT JOIN profiles p ON p.id = cic.author_id
        WHERE ${where.join(" AND ")}
        ORDER BY cic.created_at DESC
        LIMIT 25
      `,
      params,
    );

    return rows;
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return [];
    }
    throw error;
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const pool = getPostgresPool();
  const { rows } = await pool.query<{ exists: string | null }>(
    "SELECT to_regclass($1) AS exists",
    [`public.${tableName}`],
  );
  return Boolean(rows[0]?.exists);
}

function isUndefinedTableError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "42P01";
}

function formatAuthorName(fullName: string | null | undefined, role: string | null | undefined): string {
  if (fullName && fullName.trim() !== "") return fullName;
  if (role) {
    if (role === "standard_user") return "Staff Member";
    if (role === "super_admin" || role === "admin_full") return "Administrator";
    if (role === "admin_viewer") return "Viewer";
    if (role === "instructor") return "Instructor";
    if (role === "communications") return "Communications Team";
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
    pending: course.status !== "final_approved" && course.status !== "instructor_approved" && course.status !== "ready_for_instructor",
  };
}

function issueToNotification(issue: IssueRow, role: Role): NotificationItem {
  const courseTitle = issue.course_title;
  const authorName = formatAuthorName(issue.created_by_full_name, issue.created_by_role);

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
  const courseTitle = comment.course_title;
  const authorName = formatAuthorName(comment.author_full_name, comment.author_role);
  const preview = comment.body.length > 120 ? `${comment.body.slice(0, 120)}...` : comment.body;

  return {
    id: `comment-${comment.id}`,
    kind: "comment",
    tone: "default",
    title: `New comment on ${comment.issue_title ?? "an issue"}`,
    description: preview,
    courseTitle,
    meta: `By ${authorName}`,
    href: getIssueHref(comment.course_id ?? "", role),
    createdAt: comment.created_at,
    pending: true,
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

