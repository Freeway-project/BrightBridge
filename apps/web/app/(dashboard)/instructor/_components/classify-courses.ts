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
    case "instructor_viewing":      return "Ready for your review"
    case "instructor_questions":    return "Your question is with the team — we'll be in touch"
    case "instructor_approved":     return "Approved — awaiting final sign-off"
    case "final_approved":          return "Fully approved"
    case "course_created":          return "Team is assigning a reviewer"
    case "assigned_to_ta":          return "Queued for review"
    case "ta_review_in_progress":   return "Team is reviewing your course"
    case "submitted_to_admin":      return "Review complete — awaiting final approval"
    case "admin_changes_requested": return "Team is making updates"
    case "waiting_on_admin":        return "Awaiting final approval"
    case "staging_in_progress":     return "Team is building your course shell"
    case "ready_for_instructor":    return "Almost ready — being prepared for you"
    default:                        return "In progress"
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
