"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"

export async function postCommentAction(courseId: string, body: string) {
  const profile = await requireProfile()
  
  if (!body.trim()) return

  await postCourseComment({
    courseId,
    authorId: profile.userId,
    body: body.trim(),
    visibility: "internal",
  })

  revalidatePath(`/admin/courses/${courseId}`)
}
