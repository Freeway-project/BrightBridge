import type { CourseSummary } from "./service"
import type { CourseStatus } from "@coursebridge/workflow"

const TODO_STATUSES = new Set<CourseStatus>(["course_created", "assigned_to_ta"])
const IN_PROGRESS_STATUSES = new Set<CourseStatus>(["ta_review_in_progress", "admin_changes_requested"])

export function getTab(course: CourseSummary): "todo" | "in_progress" | "done" {
  const { status, reviewProgress } = course
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
