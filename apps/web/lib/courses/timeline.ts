import { getCourseRepository } from "@/lib/repositories"
import { getCourseComments, getSharedComments } from "@/lib/services/comments"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import type { IssuePhase, IssueSeverity, IssueType } from "@/lib/issues/types"

/**
 * A single entry in a course's unified activity timeline. Merges three existing
 * traced sources — status transitions (course_status_events), issues
 * (course_issues) and comments (course_comments) — into one chronological feed.
 */
export type CourseTimelineItem =
  | {
      kind: "status"
      id: string
      at: string
      actorName: string | null
      actorRole: string
      fromStatus: string | null
      toStatus: string
      note: string | null
    }
  | {
      kind: "issue_created" | "issue_resolved"
      id: string
      at: string
      actorName: string | null
      title: string
      issueType: IssueType
      severity: IssueSeverity
      phase: IssuePhase
    }
  | {
      kind: "comment"
      id: string
      at: string
      authorName: string | null
      visibility: "internal" | "instructor_visible"
      body: string
    }

interface TimelineOptions {
  /**
   * When false, only instructor-visible comments are included (CLAUDE.md
   * principle #7 keeps internal and instructor-visible comments separate).
   * Status and issue entries are identical for every role.
   */
  includeInternalComments: boolean
}

export async function getCourseTimeline(
  courseId: string,
  { includeInternalComments }: TimelineOptions,
): Promise<CourseTimelineItem[]> {
  const [statusEvents, issues, comments] = await Promise.all([
    getCourseRepository().listCourseStatusEvents(courseId),
    getIssuesForCourseAction(courseId),
    includeInternalComments ? getCourseComments(courseId) : getSharedComments(courseId),
  ])

  const items: CourseTimelineItem[] = []

  for (const event of statusEvents) {
    items.push({
      kind: "status",
      id: `status-${event.id}`,
      at: event.created_at,
      actorName: event.actor_name,
      actorRole: event.actor_role,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
    })
  }

  for (const issue of issues) {
    items.push({
      kind: "issue_created",
      id: `issue-created-${issue.id}`,
      at: issue.created_at,
      actorName: issue.created_by_profile?.full_name ?? null,
      title: issue.title,
      issueType: issue.type,
      severity: issue.severity,
      phase: issue.phase,
    })
    if (issue.resolved_at) {
      items.push({
        kind: "issue_resolved",
        id: `issue-resolved-${issue.id}`,
        at: issue.resolved_at,
        actorName: issue.owner_profile?.full_name ?? null,
        title: issue.title,
        issueType: issue.type,
        severity: issue.severity,
        phase: issue.phase,
      })
    }
  }

  for (const comment of comments) {
    items.push({
      kind: "comment",
      id: `comment-${comment.id}`,
      at: comment.created_at,
      authorName: comment.author_name ?? null,
      visibility: comment.visibility,
      body: comment.body,
    })
  }

  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
