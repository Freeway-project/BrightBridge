import "server-only";

import { getCourseStatusLabel, type CourseStatus, type Role } from "@coursebridge/workflow";
import { requireProfile } from "@/lib/auth/context";
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared";

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
  const admin = getSupabaseAdminClientOrThrow();
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
    const { data, error } = await admin
      .from("course_assignments")
      .select("course_id")
      .eq("profile_id", profileId)
      .eq("role", assignmentRole);

    if (error) {
      throw new Error(`Could not load notification assignments: ${error.message}`);
    }

    return (data ?? []).map((row) => row.course_id as string);
  }
}

async function getRelevantCourses(courseIds: string[] | null, role: Role): Promise<CourseRow[]> {
  const admin = getSupabaseAdminClientOrThrow();
  const pendingStatuses = getPendingStatuses(role);

  let query = admin
    .from("courses")
    .select("id,title,term,department,status,updated_at")
    .in("status", pendingStatuses)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (courseIds) {
    query = query.in("id", courseIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load notification courses: ${error.message}`);
  }

  return (data ?? []) as CourseRow[];
}

async function getRelevantIssues(courseIds: string[] | null): Promise<IssueRow[]> {
  const admin = getSupabaseAdminClientOrThrow();

  let query = admin
    .from("course_issues")
    .select(
      `
      id, course_id, title, type, severity, status, created_at, updated_at,
      courses ( title ),
      created_by_profile:created_by ( full_name, role )
    `,
    )
    .order("updated_at", { ascending: false })
    .limit(125);

  if (courseIds) {
    query = query.in("course_id", courseIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load notification issues: ${error.message}`);
  }

  return (data ?? []) as unknown as IssueRow[];
}

async function getRecentComments(courseIds: string[] | null, currentUserId: string): Promise<CommentRow[]> {
  const admin = getSupabaseAdminClientOrThrow();

  let query = admin
    .from("course_issue_comments")
    .select(
      `
      id, issue_id, author_id, body, created_at,
      author:author_id ( full_name, role ),
      course_issues!inner (
        course_id,
        title,
        courses ( title )
      )
    `,
    )
    .eq("is_system_message", false)
    .neq("author_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (courseIds) {
    query = query.in("course_issues.course_id", courseIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not load notification comments: ${error.message}`);
  }

  return (data ?? []) as unknown as CommentRow[];
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
  const action = getCourseActionLabel(course.status, role);

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
    pending: true,
  };
}

function getPendingStatuses(role: Role): CourseStatus[] {
  if (role === "standard_user") return Array.from(STAFF_PENDING_STATUSES);
  if (role === "instructor") return Array.from(INSTRUCTOR_PENDING_STATUSES);
  if (ADMIN_ROLES.includes(role)) return Array.from(ADMIN_PENDING_STATUSES);
  return [];
}

function getCourseActionLabel(status: CourseStatus, role: Role) {
  if (status === "course_created") return "Course needs staff assignment";
  if (status === "submitted_to_admin") return "Course is ready for admin review";
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
