'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/context'
import { createClient } from '@supabase/supabase-js'
import { CourseIssue, IssueComment, CreateIssueInput, AddCommentInput, IssueStatus } from './types'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function createIssueAction(
  courseId: string,
  phase: 'migration' | 'staging' | 'provision',
  input: CreateIssueInput
): Promise<CourseIssue> {
  const ctx = await requireProfile()

  const { data, error } = await supabase
    .from('course_issues')
    .insert({
      course_id: courseId,
      phase,
      title: input.title,
      type: input.type,
      severity: input.severity,
      description: input.description || null,
      location: input.location || null,
      direct_link: input.direct_link || null,
      owner_id: input.owner_id || null,
      created_by: ctx.userId,
    })
    .select('*')
    .single()

  if (error) throw error

  // Insert system message "Issue opened by X"
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .single()

  await supabase.from('course_issue_comments').insert({
    issue_id: data.id,
    author_id: ctx.userId,
    body: `Issue opened by ${profile?.full_name || 'User'}`,
    is_system_message: true,
  })

  revalidatePath(`/courses/${courseId}/issue-log`)
  return data as CourseIssue
}

export async function updateIssueStatusAction(issueId: string, newStatus: IssueStatus): Promise<CourseIssue> {
  const ctx = await requireProfile()

  const { data, error } = await supabase
    .from('course_issues')
    .update({
      status: newStatus,
      resolved_by: newStatus === 'resolved' ? ctx.userId : null,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', issueId)
    .select('*')
    .single()

  if (error) throw error

  // Insert system comment
  const statusLabel = newStatus === 'in_review' ? 'In Review' : newStatus === 'resolved' ? 'Resolved' : 'Open'
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .single()

  await supabase.from('course_issue_comments').insert({
    issue_id: issueId,
    author_id: ctx.userId,
    body: `Status changed to ${statusLabel} by ${profile?.full_name || 'User'}`,
    is_system_message: true,
  })

  return data as CourseIssue
}

export async function addCommentAction(issueId: string, input: AddCommentInput): Promise<IssueComment> {
  const ctx = await requireProfile()

  const { data: comment, error: commentError } = await supabase
    .from('course_issue_comments')
    .insert({
      issue_id: issueId,
      author_id: ctx.userId,
      body: input.body,
      is_system_message: false,
    })
    .select('*')
    .single()

  if (commentError) throw commentError

  // Insert mentions
  if (input.mentions && input.mentions.length > 0) {
    const mentions = input.mentions.map((profileId) => ({
      comment_id: comment.id,
      mentioned_profile_id: profileId,
    }))

    await supabase.from('issue_comment_mentions').insert(mentions)
  }

  return comment as IssueComment
}

export async function getIssuesForCourseAction(
  courseId: string,
  filters?: {
    phase?: 'migration' | 'staging' | 'provision'
    status?: IssueStatus
    type?: string
    severity?: string
  }
): Promise<CourseIssue[]> {
  let query = supabase
    .from('course_issues')
    .select(
      `*,
      created_by_profile:created_by(full_name),
      owner_profile:owner_id(full_name),
      comment_count:course_issue_comments(count)`
    )
    .eq('course_id', courseId)

  if (filters?.phase) query = query.eq('phase', filters.phase)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.severity) query = query.eq('severity', filters.severity)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return data as CourseIssue[]
}

export async function getIssueWithCommentsAction(issueId: string): Promise<CourseIssue & { comments: IssueComment[] }> {
  const { data: issue, error: issueError } = await supabase
    .from('course_issues')
    .select(
      `*,
      created_by_profile:created_by(full_name),
      owner_profile:owner_id(full_name)`
    )
    .eq('id', issueId)
    .single()

  if (issueError) throw issueError

  const { data: comments, error: commentsError } = await supabase
    .from('course_issue_comments')
    .select(
      `*,
      author:author_id(full_name, role),
      mentions:issue_comment_mentions(mentioned_profile_id)`
    )
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true })

  if (commentsError) throw commentsError

  return {
    ...(issue as CourseIssue),
    comments: comments as IssueComment[],
  }
}
