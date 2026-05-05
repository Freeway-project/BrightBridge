import { getCommentRepository, getEscalationRepository } from "@/lib/repositories"
import type { CourseComment, EscalationWithMessages } from "@/lib/repositories/contracts"

export type ConversationItem = 
  | { type: "comment"; data: CourseComment }
  | { type: "escalation"; data: EscalationWithMessages }

export async function getCourseConversation(courseId: string): Promise<ConversationItem[]> {
  const [comments, escalations] = await Promise.all([
    getCommentRepository().listCourseComments(courseId),
    getEscalationRepository().getEscalationsForCourse(courseId)
  ])

  const items: ConversationItem[] = [
    ...comments.map(c => ({ type: "comment" as const, data: c })),
    ...escalations.map(e => ({ type: "escalation" as const, data: e }))
  ]

  // Sort by created_at (escalations use their first message's date or creation date)
  // For simplicity, we can sort by the data's created_at
  items.sort((a, b) => {
    const dateA = new Date(a.type === "comment" ? a.data.created_at : a.data.created_at).getTime()
    const dateB = new Date(b.type === "comment" ? b.data.created_at : b.data.created_at).getTime()
    return dateA - dateB
  })

  return items
}
