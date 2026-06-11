export type IssuePhase = 'migration' | 'staging' | 'provision'
export type IssueType = 'escalation' | 'question' | 'fix_needed' | 'general'
export type IssueSeverity = 'minor' | 'major' | 'critical'
export type IssueStatus = 'open' | 'in_review' | 'resolved'

export interface CourseIssue {
  id: string
  course_id: string
  phase: IssuePhase
  type: IssueType
  severity: IssueSeverity
  title: string
  description: string | null
  location: string | null
  direct_link: string | null
  status: IssueStatus
  owner_id: string | null
  created_by: string
  resolved_by: string | null
  resolved_at: string | null
  legacy_escalation_id: string | null
  created_at: string
  updated_at: string
  created_by_profile?: { full_name: string }
  owner_profile?: { full_name: string }
  comment_count?: number
}

export interface IssueComment {
  id: string
  issue_id: string
  author_id: string
  body: string
  is_system_message: boolean
  created_at: string
  author?: { full_name: string; role: string }
  mentions?: { mentioned_profile_id: string }[]
}

export interface CreateIssueInput {
  title: string
  type: IssueType
  severity: IssueSeverity
  description?: string
  location?: string
  direct_link?: string
  owner_id?: string
}

export interface AddCommentInput {
  body: string
  mentions?: string[]
}
