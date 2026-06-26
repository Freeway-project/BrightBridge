"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import type { AppProfile } from "@/lib/auth/context"
import { resolveDelegationContext, transitionCourseStatus } from "@/lib/courses/service"
import { postSharedCommentAction } from "@/lib/actions/shared-comment-actions"
import { getPostgresPool } from "@/lib/postgres/pool"

async function assertInstructorOrLeader(courseId: string, profile: AppProfile): Promise<void> {
  if (profile.role === "instructor" || profile.role === "super_admin") return
  const delegation = await resolveDelegationContext({ courseId, profile })
  if (!delegation.delegated) throw new Error("Unauthorized")
}

function revalidateInstructorCourse(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath("/instructor")
  revalidatePath("/admin")
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/issue-log`)
}

/**
 * Instructor raises a question. Posts to the unified chat as a question-flagged
 * message (instructor_visible) and advances course status to instructor_questions.
 */
export async function instructorRaiseQuestionAction(
  courseId: string,
  questionTitle: string,
  questionDescription?: string,
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  const body = questionDescription?.trim()
    ? `${questionTitle.trim()}\n\n${questionDescription.trim()}`
    : questionTitle.trim()

  await postSharedCommentAction(courseId, body, true)
  revalidateInstructorCourse(courseId)
}

/**
 * Final sign-off. Advances course to instructor_approved.
 * acknowledgedIssueIds: open non-question issue IDs shown on the approve tab.
 */
export async function instructorSignOffAction(
  courseId: string,
  acknowledgedIssueIds: string[],
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  if (acknowledgedIssueIds.length > 0) {
    const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })
    try {
      const pool = getPostgresPool()
      const params: unknown[] = []
      const valueRows = acknowledgedIssueIds.map((issueId) => {
        params.push(issueId, ctx.profile.id, delegation.onBehalfOf)
        const n = params.length
        return `($${n - 2}, $${n - 1}, 'Acknowledged by instructor at sign-off.', true, $${n})`
      })
      await pool.query(
        `INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message, acting_on_behalf_of) VALUES ${valueRows.join(", ")}`,
        params,
      )
    } catch (error) {
      console.error("[instructorSignOffAction] Failed to record acknowledgements:", error)
    }
  }

  await transitionCourseStatus({
    courseId,
    toStatus: "instructor_approved",
    note: "Signed off by instructor — all good.",
  })

  revalidateInstructorCourse(courseId)
}
