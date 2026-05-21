import type { CourseSummary } from "./service"
import type { CourseStatus } from "@coursebridge/workflow"

const TODO_STATUSES = new Set<CourseStatus>(["course_created", "assigned_to_ta"])
const IN_PROGRESS_STATUSES = new Set<CourseStatus>(["ta_review_in_progress", "admin_changes_requested"])
const STAGING_STATUSES = new Set<CourseStatus>(["ready_for_instructor"])
const WITH_INSTRUCTOR_STATUSES = new Set<CourseStatus>(["sent_to_instructor", "instructor_questions", "instructor_approved"])

export type CourseTab = "todo" | "in_progress" | "done" | "staging" | "with_instructor"

export function getTab(course: CourseSummary): CourseTab {
  const { status, reviewProgress } = course
  if (STAGING_STATUSES.has(status)) return "staging"
  if (WITH_INSTRUCTOR_STATUSES.has(status)) return "with_instructor"
  if (TODO_STATUSES.has(status)) return "todo"
  if (IN_PROGRESS_STATUSES.has(status)) {
    if (status === "ta_review_in_progress") {
      const hasAnyWork =
        reviewProgress?.courseMetadata.exists ||
        reviewProgress?.reviewMatrix.exists ||
        reviewProgress?.syllabusReview.exists
      if (!hasAnyWork) return "todo"
    }
    return "in_progress"
  }
  return "done"
}
