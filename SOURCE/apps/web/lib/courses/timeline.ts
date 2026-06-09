import { getCourseRepository } from "@/lib/repositories"
import { getCourseComments, getSharedComments } from "@/lib/services/comments"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import type { IssuePhase, IssueSeverity, IssueType } from "@/lib/issues/types"
import type { CourseAuditEntry } from "@/lib/repositories/contracts"

/**
 * A single entry in a course's unified activity timeline. Merges the traced
 * sources — status transitions (course_status_events), issues (course_issues),
 * comments (course_comments) — plus the previously-untraced activity now
 * captured in audit_log (assignments, escalations, escalation messages, issue
 * comments) into one chronological feed.
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
  | {
      // audit_log-sourced activity that the other sources don't cover.
      kind: "assignment" | "escalation" | "escalation_message" | "issue_comment"
      id: string
      at: string
      actorName: string | null
      summary: string
      detail: string | null
    }

/** Build a human-readable summary + detail for an audit_log entry. */
function describeAuditEntry(entry: CourseAuditEntry): { summary: string; detail: string | null } {
  switch (entry.tableName) {
    case "course_assignments": {
      const role = entry.role ?? "user"
      const who = entry.targetName ?? "someone"
      const verb = entry.action === "DELETE" ? "Unassigned" : "Assigned"
      return { summary: `${verb} ${role}: ${who}`, detail: null }
    }
    case "course_escalations": {
      const resolved = entry.status === "resolved" || entry.action === "DELETE"
      return {
        summary: resolved ? "Escalation resolved" : `Escalation raised${entry.title ? `: ${entry.title}` : ""}`,
        detail: resolved ? null : entry.title,
      }
    }
    case "escalation_messages":
      return { summary: "Escalation reply", detail: entry.body }
    case "course_issue_comments":
      return { summary: entry.isSystem ? "Issue update" : "Issue comment", detail: entry.body }
    default:
      return { summary: "Activity", detail: null }
  }
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
  const [statusEvents, issues, comments, auditEntries] = await Promise.all([
    getCourseRepository().listCourseStatusEvents(courseId),
    getIssuesForCourseAction(courseId),
    includeInternalComments ? getCourseComments(courseId) : getSharedComments(courseId),
    getCourseRepository().listCourseAuditEntries(courseId),
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

  // audit_log activity (assignments, escalations, escalation messages, issue
  // comments) is internal — only surface it on internal-facing timelines, never
  // the instructor view (CLAUDE.md principle #7).
  if (includeInternalComments) {
    const KIND_BY_TABLE: Record<CourseAuditEntry["tableName"], Extract<CourseTimelineItem, { summary: string }>["kind"]> = {
      course_assignments: "assignment",
      course_escalations: "escalation",
      escalation_messages: "escalation_message",
      course_issue_comments: "issue_comment",
    }
    for (const entry of auditEntries) {
      const { summary, detail } = describeAuditEntry(entry)
      items.push({
        kind: KIND_BY_TABLE[entry.tableName],
        id: `audit-${entry.id}`,
        at: entry.at,
        actorName: entry.actorName,
        summary,
        detail,
      })
    }
  }

  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
