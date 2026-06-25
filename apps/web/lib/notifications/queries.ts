import "server-only";

import { getCourseStatusLabel, type CourseStatus, type Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getPostgresPool } from "@/lib/postgres/pool";

type NotificationKind = "course_action" | "comment";
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
const COMMENT_PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type NotificationsPageData = {
  notifications: NotificationItem[];
  pendingCount: number;
  role: Role;
  error: boolean;
};

export async function getNotificationCount(): Promise<number> {
  const context = await requireProfile();
  const { id: profileId, role } = context.profile;
  const isAdmin = ADMIN_ROLES.includes(role as Role);
  const assignmentRole = role === "instructor" ? "instructor" : "staff";

  const pool = getPostgresPool();
  const { rows } = await pool.query<{ cnt: string }>(
    `
    WITH
    assigned_courses AS (
      SELECT ca.course_id
      FROM course_assignments ca
      WHERE NOT $1::boolean AND ca.profile_id = $2 AND ca.role = $3
    ),
    dismissed AS (
      SELECT notification_id FROM dismissed_notifications WHERE user_id = $2
    ),
    pending_instructor_questions AS (
      SELECT 'course-' || c.id || '-' || c.status AS nid
      FROM courses c
      WHERE c.status = 'instructor_questions'
        AND ($1::boolean OR c.id IN (SELECT course_id FROM assigned_courses))
        AND NOT EXISTS (
          SELECT 1 FROM dismissed d
          WHERE d.notification_id = 'course-' || c.id || '-' || c.status
        )
    ),
    pending_instructor_comments AS (
      SELECT 'comment-' || cmt.id AS nid
      FROM course_issue_comments cmt
      INNER JOIN course_issues ci ON ci.id = cmt.issue_id
      INNER JOIN profiles p ON p.id = cmt.author_id
      WHERE cmt.is_system_message = false
        AND cmt.author_id != $2
        AND p.role = 'instructor'
        AND cmt.created_at > NOW() - INTERVAL '7 days'
        AND ($1::boolean OR ci.course_id IN (SELECT course_id FROM assigned_courses))
        AND NOT EXISTS (
          SELECT 1 FROM dismissed d WHERE d.notification_id = 'comment-' || cmt.id
        )
    )
    SELECT (
      (SELECT COUNT(*) FROM pending_instructor_questions) +
      (SELECT COUNT(*) FROM pending_instructor_comments)
    ) AS cnt
    `,
    [isAdmin, profileId, assignmentRole],
  );

  return parseInt(rows[0]?.cnt ?? "0", 10);
}

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

    const [instructorCourses, instructorComments, dismissedIds] = await Promise.all([
      getInstructorQuestionCourses(accessibleCourseIds),
      getInstructorComments(accessibleCourseIds, context.profile.id),
      getDismissedIds(context.profile.id),
    ]);

    const notifications = [
      ...instructorCourses.map((course) => courseToNotification(course, role)),
      ...instructorComments.map((comment) => commentToNotification(comment, role)),
    ]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((n) => !dismissedIds.has(n.id));

    return {
      notifications,
      pendingCount: notifications.filter((item) => item.pending).length,
      role,
      error: false,
    };
  } catch (err) {
    console.error("Could not load notifications page data:", err);
    return { notifications: [], pendingCount: 0, role, error: true };
  }
}

async function getAssignedCourseIds(profileId: string, profileRole: Role): Promise<string[]> {
  const assignmentRole = profileRole === "instructor" ? "instructor" : "staff";
  const { rows } = await getPostgresPool().query<{ course_id: string }>(
    `SELECT course_id FROM course_assignments WHERE profile_id = $1 AND role = $2`,
    [profileId, assignmentRole],
  );
  return rows.map((r) => r.course_id);
}

async function getInstructorQuestionCourses(courseIds: string[] | null): Promise<CourseRow[]> {
  const pool = getPostgresPool();
  const values: unknown[] = [];
  let courseFilter = "";
  if (courseIds) {
    values.push(courseIds);
    courseFilter = `AND id = ANY($${values.length}::uuid[])`;
  }
  const { rows } = await pool.query<CourseRow>(
    `SELECT id, title, term, department, status, updated_at
     FROM courses
     WHERE status = 'instructor_questions' ${courseFilter}
     ORDER BY updated_at DESC
     LIMIT 50`,
    values,
  );
  return rows;
}

async function getInstructorComments(courseIds: string[] | null, currentUserId: string): Promise<CommentRow[]> {
  const pool = getPostgresPool();
  const values: unknown[] = [currentUserId];
  let courseFilter = "";
  if (courseIds) {
    values.push(courseIds);
    courseFilter = `AND i.course_id = ANY($${values.length}::uuid[])`;
  }
  const { rows } = await pool.query<CommentRow>(
    `SELECT c.id, c.issue_id, c.author_id, c.body, c.created_at,
            i.course_id, i.title AS issue_title, crs.title AS course_title,
            p.full_name AS author_full_name, p.role AS author_role
     FROM course_issue_comments c
     INNER JOIN course_issues i ON i.id = c.issue_id
     LEFT JOIN courses crs ON crs.id = i.course_id
     INNER JOIN profiles p ON p.id = c.author_id
     WHERE c.is_system_message = false
       AND c.author_id != $1
       AND p.role = 'instructor'
       ${courseFilter}
     ORDER BY c.created_at DESC
     LIMIT 25`,
    values,
  );
  return rows;
}

async function getDismissedIds(userId: string): Promise<Set<string>> {
  const { rows } = await getPostgresPool().query<{ notification_id: string }>(
    `SELECT notification_id FROM dismissed_notifications WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.notification_id));
}

function courseToNotification(course: CourseRow, role: Role): NotificationItem {
  const label = getCourseStatusLabel(course.status);
  const title =
    role === "instructor" ? "Questions need follow-up" : "Instructor has questions";

  return {
    id: `course-${course.id}-${course.status}`,
    kind: "course_action",
    tone: "warning",
    title,
    description: `${course.title} — an instructor has questions waiting for review.`,
    courseTitle: course.title,
    meta: [label, course.department, course.term].filter(Boolean).join(" · "),
    href: getCourseHref(course.id, role),
    createdAt: course.updated_at,
    pending: true,
  };
}

function commentToNotification(comment: CommentRow, role: Role): NotificationItem {
  const authorName = comment.author_full_name?.trim() || "Instructor";
  const preview = comment.body.length > 120 ? `${comment.body.slice(0, 120)}...` : comment.body;

  return {
    id: `comment-${comment.id}`,
    kind: "comment",
    tone: "default",
    title: `Message from ${authorName}`,
    description: preview,
    courseTitle: comment.course_title,
    meta: `On: ${comment.issue_title ?? "an issue"}`,
    href: getIssueHref(comment.course_id, role),
    createdAt: comment.created_at,
    pending: Date.now() - Date.parse(comment.created_at) < COMMENT_PENDING_WINDOW_MS,
  };
}

function getCourseHref(courseId: string, role: Role): string {
  if (ADMIN_ROLES.includes(role)) return `/admin/courses/${courseId}`;
  if (role === "instructor") return "/instructor";
  return `/courses/${courseId}/metadata`;
}

function getIssueHref(courseId: string, role: Role): string {
  if (!courseId) return "/notifications";
  if (ADMIN_ROLES.includes(role)) return `/admin/courses/${courseId}`;
  return `/courses/${courseId}/issue-log`;
}
