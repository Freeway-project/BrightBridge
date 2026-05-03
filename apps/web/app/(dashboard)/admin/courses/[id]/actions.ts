"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"
import { addEscalationMessage, resolveEscalation } from "@/lib/services/escalations"

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

export async function sendEscalationReplyAction(
  courseId: string,
  escalationId: string,
  body: string,
) {
  const profile = await requireProfile()
  if (!body.trim()) return
  try {
    await addEscalationMessage(escalationId, profile.userId, body.trim())
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/courses/${courseId}`)
  } catch (err) {
    console.error("[escalation] sendEscalationReplyAction:", err)
    throw new Error("Could not send reply. Please ensure the database migration has been applied.")
  }
}

export async function resolveEscalationAction(escalationId: string, courseId: string) {
  const profile = await requireProfile()
  try {
    await resolveEscalation(escalationId, profile.userId)
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/admin`)
    revalidatePath(`/courses/${courseId}`)
  } catch (err) {
    console.error("[escalation] resolveEscalationAction:", err)
    throw new Error("Could not resolve escalation. Please ensure the database migration has been applied.")
  }
}
