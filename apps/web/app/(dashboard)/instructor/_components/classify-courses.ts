import { isInstructorActionableStatus, type CourseStatus } from "@coursebridge/workflow"

/**
 * Action-first bucketing for the instructor landing. The "needs review" set is
 * derived from the workflow's own instructor-actionable statuses so the two can
 * never drift. Pure + dependency-light so it's unit-testable and ports cleanly.
 */
export type InstructorBucket = "needs_review" | "waiting" | "approved"

export type InstructorCourseLike = {
  id: string
  status: CourseStatus
  /** When the course last changed — used to order the review queue oldest-first. */
  updatedAt?: string
}

export type ClassifiedCourse<T> = {
  course: T
  bucket: InstructorBucket
  /** Plain-language "what's going on / what to do" line for the card. */
  actionLabel: string
}

export function bucketForStatus(status: CourseStatus): InstructorBucket {
  if (isInstructorActionableStatus(status)) return "needs_review"
  if (status === "instructor_approved" || status === "final_approved") return "approved"
  return "waiting"
}

export function actionLabelForStatus(status: CourseStatus): string {
  if (isInstructorActionableStatus(status)) return "Ready for your review"
  if (status === "instructor_questions") return "You asked a question — waiting on the team"
  if (status === "instructor_approved" || status === "final_approved") return "Approved"
  return "In progress with the team"
}

export type ClassifiedCourses<T> = {
  needsReview: ClassifiedCourse<T>[]
  waiting: ClassifiedCourse<T>[]
  approved: ClassifiedCourse<T>[]
}

export function classifyInstructorCourses<T extends InstructorCourseLike>(
  courses: readonly T[],
): ClassifiedCourses<T> {
  const result: ClassifiedCourses<T> = { needsReview: [], waiting: [], approved: [] }

  for (const course of courses) {
    const bucket = bucketForStatus(course.status)
    const item: ClassifiedCourse<T> = {
      course,
      bucket,
      actionLabel: actionLabelForStatus(course.status),
    }
    if (bucket === "needs_review") result.needsReview.push(item)
    else if (bucket === "approved") result.approved.push(item)
    else result.waiting.push(item)
  }

  // Surface the longest-waiting review first so nothing rots at the bottom.
  result.needsReview.sort((a, b) => (a.course.updatedAt ?? "").localeCompare(b.course.updatedAt ?? ""))

  return result
}
