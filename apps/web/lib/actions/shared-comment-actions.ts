"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"
import { getCommentRepository, getCourseRepository } from "@/lib/repositories"
import { resolveDelegationContext, transitionCourseStatus } from "@/lib/courses/service"
import { broadcastCourseCommentEvent } from "@/lib/supabase/broadcast"

function revalidateCourse(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}`)
}

export async function postSharedCommentAction(
  courseId: string,
  body: string,
  isQuestion = false,
): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["instructor", "admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })

  await postCourseComment({
    courseId,
    authorId: ctx.userId,
    body: body.trim(),
    visibility: "instructor_visible",
    actingOnBehalfOf: delegation.onBehalfOf,
    isQuestion,
  })

  // When the instructor flags a question, advance the course status so admin/TA
  // know a reply is needed. Only valid from sent_to_instructor or instructor_viewing.
  if (isQuestion) {
    try {
      const current = await getCourseRepository().getCourseSummaryById(courseId)
      if (
        current.status === "sent_to_instructor" ||
        current.status === "instructor_viewing"
      ) {
        await transitionCourseStatus({
          courseId,
          toStatus: "instructor_questions",
          note: `Instructor question: ${body.trim().split("\n")[0].slice(0, 120)}`,
        })
      }
    } catch {
      // Non-fatal: comment is already saved; status transition failure shouldn't
      // surface to the instructor.
    }
  }

  revalidateCourse(courseId)
  void broadcastCourseCommentEvent(courseId)
}

export async function markAnsweredAction(
  courseId: string,
  commentId: string,
): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  await getCommentRepository().markCommentAnswered(commentId, courseId)

  revalidateCourse(courseId)
  void broadcastCourseCommentEvent(courseId)
}
