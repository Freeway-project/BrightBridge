import { getCommentRepository } from "@/lib/repositories"
import type { CourseComment } from "@/lib/repositories/contracts"
export type { CourseComment } from "@/lib/repositories/contracts"

export async function getCourseComments(courseId: string): Promise<CourseComment[]> {
  return getCommentRepository().listCourseComments(courseId)
}

export async function postCourseComment({
  courseId,
  authorId,
  body,
  visibility = "internal",
  parentCommentId = null,
}: {
  courseId: string
  authorId: string
  body: string
  visibility?: "internal" | "instructor_visible"
  parentCommentId?: string | null
}): Promise<CourseComment> {
  return getCommentRepository().postCourseComment({
    courseId,
    authorId,
    body,
    visibility,
    parentCommentId,
  })
}
