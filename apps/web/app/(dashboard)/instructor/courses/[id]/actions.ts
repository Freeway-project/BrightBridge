"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import type { AppProfile } from "@/lib/auth/context"
import { resolveDelegationContext, transitionCourseStatus } from "@/lib/courses/service"
import { createIssueAction } from "@/lib/issues/actions"
import { getCourseRepository } from "@/lib/repositories"
import { getPostgresPool } from "@/lib/postgres/pool"
import type { IssueComment } from "@/lib/issues/types"

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
 * Instructor raises a question. Routed to the assigned TA (issue owner) so they
 * can respond; the course moves to instructor_questions so the workflow is
 * visibly blocked. Admin retains visibility and still controls the re-send.
 */
export async function instructorRaiseQuestionAction(
  courseId: string,
  questionTitle: string,
  questionDescription?: string,
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  // Route the question to the assigned TA when there is one.
  const course = await getCourseRepository().getAdminCourse(courseId)
  const taId = course?.ta?.id ?? null

  await createIssueAction(courseId, "provision", {
    title: questionTitle.trim(),
    type: "question",
    severity: "minor",
    description: questionDescription?.trim() || undefined,
    owner_id: taId ?? undefined,
  })

  // createIssueAction already auto-advances sent_to_instructor → instructor_questions.
  // Only move it ourselves when it hasn't (e.g. the instructor had already opened the
  // course, so it sits in instructor_viewing). Transitioning to the status it is
  // already in is an illegal self-transition that would throw and 500 the request.
  const current = await getCourseRepository().getCourseSummaryById(courseId)
  if (current.status !== "instructor_questions") {
    await transitionCourseStatus({
      courseId,
      toStatus: "instructor_questions",
      note: `Instructor question: ${questionTitle.trim()}`,
    })
  }

  revalidateInstructorCourse(courseId)
}

/**
 * Fetches the comments for a specific issue the instructor raised.
 * Allows the instructor to read admin/TA replies inline.
 */
export async function getIssueCommentsAction(
  courseId: string,
  issueId: string,
): Promise<IssueComment[]> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  const pool = getPostgresPool()
  const { rows } = await pool.query<{
    id: string
    issue_id: string
    author_id: string
    body: string
    is_system_message: boolean
    created_at: string
    author_full_name: string | null
    author_role: string | null
  }>(
    `SELECT c.id, c.issue_id, c.author_id, c.body, c.is_system_message, c.created_at,
            p.full_name AS author_full_name, p.role AS author_role
     FROM course_issue_comments c
     INNER JOIN profiles p ON p.id = c.author_id
     INNER JOIN course_issues ci ON ci.id = c.issue_id
     WHERE c.issue_id = $1 AND ci.course_id = $2
     ORDER BY c.created_at ASC`,
    [issueId, courseId],
  )

  return rows.map((r) => ({
    id: r.id,
    issue_id: r.issue_id,
    author_id: r.author_id,
    body: r.body,
    is_system_message: r.is_system_message,
    created_at: r.created_at,
    author: r.author_full_name ? { full_name: r.author_full_name, role: r.author_role ?? "" } : undefined,
  }))
}

/**
 * Instructor posts a reply to an issue thread (responding to admin/TA).
 */
export async function postIssueCommentAction(
  courseId: string,
  issueId: string,
  body: string,
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  const delegation = await resolveDelegationContext({ courseId, profile: ctx.profile })
  const pool = getPostgresPool()
  await pool.query(
    `INSERT INTO course_issue_comments (issue_id, author_id, body, acting_on_behalf_of)
     SELECT $1, $2, $3, $4
     WHERE EXISTS (SELECT 1 FROM course_issues WHERE id = $1 AND course_id = $5)`,
    [issueId, ctx.profile.id, body.trim(), delegation.onBehalfOf, courseId],
  )

  revalidateInstructorCourse(courseId)
}

/**
 * Final sign-off. Called from the Final Summary & Sign-off dialog once the
 * instructor has acknowledged every open issue. Records an acknowledgement
 * system comment on each issue, then advances the course to instructor_approved.
 */
export async function instructorSignOffAction(
  courseId: string,
  acknowledgedIssueIds: string[],
): Promise<void> {
  const ctx = await requireProfile()
  await assertInstructorOrLeader(courseId, ctx.profile)

  if (acknowledgedIssueIds.length > 0) {
    // When a hierarchy leader signs off for the instructor, record the
    // acknowledgement under the leader's name on the instructor's behalf.
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
