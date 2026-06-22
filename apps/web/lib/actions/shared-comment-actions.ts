"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"
import { resolveDelegationContext } from "@/lib/courses/service"

export async function postSharedCommentAction(courseId: string, body: string): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["instructor", "admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  // When a hierarchy leader posts on an instructor's course they don't own,
  // record whose behalf they posted on so the TA sees the full context.
  const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })

  await postCourseComment({
    courseId,
    authorId: ctx.userId,
    body: body.trim(),
    visibility: "instructor_visible",
    actingOnBehalfOf: delegation.onBehalfOf,
  })

  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}`)
}
