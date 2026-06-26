import { getCommentRepository, getProfileRepository } from "@/lib/repositories"
import type { CourseComment } from "@/lib/repositories/contracts"
import { resolveLeaderTitleMap } from "@/lib/hierarchy/leadership"
export type { CourseComment } from "@/lib/repositories/contracts"

/**
 * Adds the display context a reader (especially the TA) needs to know WHO is
 * actually speaking: each author's highest leadership title (so a dean shows as
 * "Dean", not a generic "Instructor"), and the name of the instructor a leader
 * posted on behalf of. Both are resolved in batch to avoid an N+1.
 */
async function enrichCommentIdentity(comments: CourseComment[]): Promise<CourseComment[]> {
  if (comments.length === 0) return comments

  const authorIds = [...new Set(comments.map((c) => c.author_id))]
  const titleMap = await resolveLeaderTitleMap(authorIds)

  const behalfIds = [
    ...new Set(comments.map((c) => c.acting_on_behalf_of).filter((v): v is string => !!v)),
  ]
  const behalfNames = new Map<string, string | null>()
  await Promise.all(
    behalfIds.map(async (id) => {
      const profile = await getProfileRepository().getProfileById(id)
      behalfNames.set(id, profile?.fullName ?? null)
    }),
  )

  return comments.map((c) => ({
    ...c,
    author_title: titleMap.get(c.author_id) ?? null,
    on_behalf_of_name: c.acting_on_behalf_of ? behalfNames.get(c.acting_on_behalf_of) ?? null : null,
  }))
}

export async function getCourseComments(courseId: string): Promise<CourseComment[]> {
  return enrichCommentIdentity(await getCommentRepository().listCourseComments(courseId))
}

export async function getSharedComments(courseId: string): Promise<CourseComment[]> {
  return enrichCommentIdentity(
    await getCommentRepository().listCourseComments(courseId, "instructor_visible"),
  )
}

export async function postCourseComment({
  courseId,
  authorId,
  body,
  visibility = "internal",
  parentCommentId = null,
  actingOnBehalfOf = null,
  isQuestion = false,
}: {
  courseId: string
  authorId: string
  body: string
  visibility?: "internal" | "instructor_visible"
  parentCommentId?: string | null
  actingOnBehalfOf?: string | null
  isQuestion?: boolean
}): Promise<CourseComment> {
  return getCommentRepository().postCourseComment({
    courseId,
    authorId,
    body,
    visibility,
    parentCommentId,
    actingOnBehalfOf,
    isQuestion,
  })
}
