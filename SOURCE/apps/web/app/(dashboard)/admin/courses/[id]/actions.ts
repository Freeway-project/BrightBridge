"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { postCourseComment } from "@/lib/services/comments"
import { addEscalationMessage, resolveEscalation } from "@/lib/services/escalations"
import { overrideCourseStatus } from "@/lib/services/course-status-override"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"
import type { CourseStatus } from "@coursebridge/workflow"

export async function postCommentAction(courseId: string, body: string) {
  const profile = await requireProfile()

  if (!body.trim()) return

  try {
    await postCourseComment({
      courseId,
      authorId: profile.userId,
      body: body.trim(),
      visibility: "internal",
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_course_detail")
      scope.setTag("action", "post_comment")
      scope.setContext("comment", {
        actorId: profile.userId,
        courseId,
      })
      Sentry.captureException(err instanceof Error ? err : new Error("postCommentAction failed"))
    })
    throw err
  }

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
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_course_detail")
      scope.setTag("action", "send_escalation_reply")
      scope.setContext("escalation_reply", {
        actorId: profile.userId,
        courseId,
        escalationId,
      })
      Sentry.captureException(err instanceof Error ? err : new Error("sendEscalationReplyAction failed"))
    })
    console.error("[escalation] sendEscalationReplyAction:", err)
    throw new Error("Could not send reply. Please ensure the database migration has been applied.")
  }
}

export async function resolveEscalationAction(escalationId: string, courseId: string, resolutionNote?: string) {
  const profile = await requireProfile()
  try {
    await resolveEscalation(escalationId, profile.userId, resolutionNote)

    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/admin`)
    revalidatePath(`/courses/${courseId}`)
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_course_detail")
      scope.setTag("action", "resolve_escalation")
      scope.setContext("resolve_escalation", {
        actorId: profile.userId,
        courseId,
        escalationId,
      })
      Sentry.captureException(err instanceof Error ? err : new Error("resolveEscalationAction failed"))
    })
    console.error("[escalation] resolveEscalationAction:", err)
    throw new Error("Could not resolve escalation. Please ensure the database migration has been applied.")
  }
}

const OVERRIDE_ROLES = new Set(["admin_full", "super_admin"])

export async function overrideCourseStatusAction(input: {
  courseId: string
  to: CourseStatus
  reason: string
}) {
  const profile = await requireProfile()
  if (profile.kind !== "profile" || !OVERRIDE_ROLES.has(profile.profile.role)) {
    throw new Error("Forbidden")
  }

  try {
    await overrideCourseStatus(getSupabaseAdminClientOrThrow(), {
      courseId: input.courseId,
      to: input.to,
      reason: input.reason,
      actorId: profile.userId,
      actorRole: profile.profile.role,
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("area", "admin_course_detail")
      scope.setTag("action", "override_course_status")
      scope.setContext("override", {
        actorId: profile.userId,
        courseId: input.courseId,
        to: input.to,
      })
      Sentry.captureException(err instanceof Error ? err : new Error("overrideCourseStatusAction failed"))
    })
    throw err
  }

  revalidatePath(`/admin/courses/${input.courseId}`)
  revalidatePath(`/admin`)
  revalidatePath(`/courses/${input.courseId}`)
}
