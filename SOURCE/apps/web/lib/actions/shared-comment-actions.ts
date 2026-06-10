"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"

export async function postSharedCommentAction(courseId: string, body: string): Promise<void> {
  const ctx = await requireProfile()
  const allowed = ["instructor", "admin_viewer", "admin_full", "super_admin", "standard_user"]
  if (!allowed.includes(ctx.profile.role)) throw new Error("Unauthorized")

  await postCourseComment({
    courseId,
    authorId: ctx.userId,
    body: body.trim(),
    visibility: "instructor_visible",
  })

  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath(`/communications/courses/${courseId}`)
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}`)
}
