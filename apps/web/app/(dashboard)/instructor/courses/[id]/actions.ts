"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { transitionCourseStatus } from "@/lib/courses/service"
import { createIssueAction } from "@/lib/issues/actions"

export async function instructorApproveAction(courseId: string): Promise<void> {
  const ctx = await requireProfile()
  if (ctx.profile.role !== "instructor" && ctx.profile.role !== "super_admin") {
    throw new Error("Unauthorized")
  }
  await transitionCourseStatus({ courseId, toStatus: "instructor_approved", note: "Approved by instructor." })
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath("/instructor")
  revalidatePath("/admin")
  revalidatePath(`/admin/courses/${courseId}`)
}

export async function instructorRaiseQuestionAction(
  courseId: string,
  questionTitle: string,
  questionDescription?: string,
): Promise<void> {
  const ctx = await requireProfile()
  if (ctx.profile.role !== "instructor" && ctx.profile.role !== "super_admin") {
    throw new Error("Unauthorized")
  }

  // Create a tracked issue record so the question is never lost
  await createIssueAction(courseId, "provision", {
    title: questionTitle.trim(),
    type: "question",
    severity: "minor",
    description: questionDescription?.trim() || null,
  })

  // Transition course status so admin is visibly blocked
  await transitionCourseStatus({
    courseId,
    toStatus: "instructor_questions",
    note: `Instructor question: ${questionTitle.trim()}`,
  })

  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath("/instructor")
  revalidatePath("/admin")
  revalidatePath(`/admin/courses/${courseId}`)
}
