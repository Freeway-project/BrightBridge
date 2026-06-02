import type { CourseSummary } from "./service"
import type { CourseStatus } from "@coursebridge/workflow"

const TODO_STATUSES = new Set<CourseStatus>(["course_created", "assigned_to_ta"])
const IN_PROGRESS_STATUSES = new Set<CourseStatus>(["ta_review_in_progress", "admin_changes_requested"])
const PENDING_ADMIN_STATUSES = new Set<CourseStatus>(["submitted_to_admin"])
const STAGING_STATUSES = new Set<CourseStatus>(["ready_for_instructor"])
const WITH_INSTRUCTOR_STATUSES = new Set<CourseStatus>(["sent_to_instructor", "instructor_questions", "instructor_approved"])

export type CourseTab = "todo" | "in_progress" | "pending_admin" | "staging" | "with_instructor" | "done"

export function getTab(course: CourseSummary): CourseTab {
  const { status } = course
  if (STAGING_STATUSES.has(status)) return "staging"
  if (WITH_INSTRUCTOR_STATUSES.has(status)) return "with_instructor"
  if (TODO_STATUSES.has(status)) return "todo"
  if (IN_PROGRESS_STATUSES.has(status)) return "in_progress"
  if (PENDING_ADMIN_STATUSES.has(status)) return "pending_admin"
  return "done"
}
