"use server"

import { revalidatePath } from "next/cache"
import { requireProfile } from "@/lib/auth/context"
import { transitionCourseStatus } from "@/lib/courses/service"

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

export async function instructorRaiseQuestionAction(courseId: string): Promise<void> {
  const ctx = await requireProfile()
  if (ctx.profile.role !== "instructor" && ctx.profile.role !== "super_admin") {
    throw new Error("Unauthorized")
  }
  await transitionCourseStatus({ courseId, toStatus: "instructor_questions", note: "Instructor raised a question." })
  revalidatePath(`/instructor/courses/${courseId}`)
  revalidatePath("/instructor")
  revalidatePath("/admin")
  revalidatePath(`/admin/courses/${courseId}`)
}
