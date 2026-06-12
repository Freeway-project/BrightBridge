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
  if (status === "instructor_approved") return "approved"
  return "waiting"
}

export function actionLabelForStatus(status: CourseStatus): string {
  switch (status) {
    case "sent_to_instructor":
    case "instructor_viewing":   return "Ready for your review"
    case "instructor_questions": return "Awaiting team response"
    case "instructor_approved":  return "Approved — awaiting final sign-off"
    case "final_approved":       return "Approved"
    case "course_created":       return "Awaiting TA assignment"
    case "assigned_to_ta":       return "TA assigned — not yet started"
    case "ta_review_in_progress":return "TA review in progress"
    case "submitted_to_admin":   return "Submitted — awaiting admin review"
    case "admin_changes_requested": return "Admin requested changes"
    case "waiting_on_admin":     return "Waiting on admin"
    case "staging_in_progress":  return "Staging in progress"
    case "ready_for_instructor": return "Ready to send to instructor"
    default:                     return "In progress"
  }
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
  result.needsReview.sort((a, b) => {
    const aTime = a.course.updatedAt ? new Date(a.course.updatedAt).getTime() : 0
    const bTime = b.course.updatedAt ? new Date(b.course.updatedAt).getTime() : 0
    return aTime - bTime
  })

  return result
}
