"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { transitionCourseStatus } from "@/lib/courses/service"
import { createIssueAction } from "@/lib/issues/actions"
import { getCourseRepository } from "@/lib/repositories"
import { getSupabaseAdminClientOrThrow } from "@/lib/repositories/supabase/shared"

function assertInstructor(role: string) {
  if (role !== "instructor" && role !== "super_admin") {
    throw new Error("Unauthorized")
  }
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
  assertInstructor(ctx.profile.role)

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

  await transitionCourseStatus({
    courseId,
    toStatus: "instructor_questions",
    note: `Instructor question: ${questionTitle.trim()}`,
  })

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
  assertInstructor(ctx.profile.role)

  if (acknowledgedIssueIds.length > 0) {
    const admin = getSupabaseAdminClientOrThrow()
    const rows = acknowledgedIssueIds.map((issueId) => ({
      issue_id: issueId,
      author_id: ctx.profile.id,
      body: "Acknowledged by instructor at sign-off.",
      is_system_message: true,
    }))
    const { error } = await admin.from("course_issue_comments").insert(rows)
    if (error) {
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
