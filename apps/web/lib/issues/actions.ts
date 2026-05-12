'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/context'
import { createClient } from '@supabase/supabase-js'
import { CourseIssue, IssueComment, CreateIssueInput, AddCommentInput, IssueStatus } from './types'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type IssueCountSummary = { open: number; resolved: number }

export async function getIssueCountsForCoursesAction(
  courseIds: string[]
): Promise<Map<string, IssueCountSummary>> {
  if (!courseIds.length) return new Map()

  const { data, error } = await supabase
    .from('course_issues')
    .select('course_id, status')
    .in('course_id', courseIds)

  if (error) return new Map()

  const map = new Map<string, IssueCountSummary>()
  for (const row of data ?? []) {
    const existing = map.get(row.course_id) ?? { open: 0, resolved: 0 }
    if (row.status === 'resolved') existing.resolved++
    else existing.open++
    map.set(row.course_id, existing)
  }
  return map
}

export async function createIssueAction(
  courseId: string,
  phase: 'migration' | 'staging' | 'provision',
  input: CreateIssueInput
): Promise<CourseIssue> {
  try {
    if (!courseId || !phase) throw new Error('Missing required fields: courseId or phase')
    if (!input.title?.trim()) throw new Error('Issue title is required')
    if (input.title.length > 500) throw new Error('Issue title must be 500 characters or less')

    const ctx = await requireProfile()

    const { data, error } = await supabase
      .from('course_issues')
      .insert({
        course_id: courseId,
        phase,
        title: input.title.trim(),
        type: input.type,
        severity: input.severity,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        direct_link: input.direct_link?.trim() || null,
        owner_id: input.owner_id || null,
        created_by: ctx.userId,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[createIssueAction] DB insert error:', error)
      throw new Error(error.message || 'Failed to create issue')
    }

    // Insert system message "Issue opened by X"
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .single()

    const commentError = await supabase.from('course_issue_comments').insert({
      issue_id: data.id,
      author_id: ctx.userId,
      body: `Issue opened by ${profile?.full_name || 'User'}`,
      is_system_message: true,
    })

    if (commentError.error) {
      console.error('[createIssueAction] Comment insert error:', commentError.error)
    }

    revalidatePath(`/courses/${courseId}/issue-log`)
    return data as CourseIssue
  } catch (err) {
    console.error('[createIssueAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to create issue')
  }
}

export async function updateIssueStatusAction(issueId: string, newStatus: IssueStatus): Promise<CourseIssue> {
  try {
    if (!issueId) throw new Error('Issue ID is required')
    if (!['open', 'in_review', 'resolved'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`)
    }

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

    if (error) {
      console.error('[updateIssueStatusAction] DB update error:', error)
      throw new Error(error.message || 'Failed to update issue status')
    }

    // Insert system comment
    const statusLabel = newStatus === 'in_review' ? 'In Review' : newStatus === 'resolved' ? 'Resolved' : 'Open'
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .single()

    const commentError = await supabase.from('course_issue_comments').insert({
      issue_id: issueId,
      author_id: ctx.userId,
      body: `Status changed to ${statusLabel} by ${profile?.full_name || 'User'}`,
      is_system_message: true,
    })

    if (commentError.error) {
      console.error('[updateIssueStatusAction] Comment insert error:', commentError.error)
    }

    revalidatePath(`/courses/${data.course_id}/issue-log`)
    return data as CourseIssue
  } catch (err) {
    console.error('[updateIssueStatusAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to update issue status')
  }
}

export async function addCommentAction(issueId: string, input: AddCommentInput): Promise<IssueComment> {
  try {
    if (!issueId) throw new Error('Issue ID is required')
    if (!input.body?.trim()) throw new Error('Comment body is required')
    if (input.body.length > 5000) throw new Error('Comment must be 5000 characters or less')

    const ctx = await requireProfile()

    const { data: comment, error: commentError } = await supabase
      .from('course_issue_comments')
      .insert({
        issue_id: issueId,
        author_id: ctx.userId,
        body: input.body.trim(),
        is_system_message: false,
      })
      .select('*')
      .single()

    if (commentError) {
      console.error('[addCommentAction] Comment insert error:', commentError)
      throw new Error(commentError.message || 'Failed to add comment')
    }

    // Insert mentions
    if (input.mentions && input.mentions.length > 0) {
      const mentions = input.mentions.map((profileId) => ({
        comment_id: comment.id,
        mentioned_profile_id: profileId,
      }))

      const mentionError = await supabase.from('issue_comment_mentions').insert(mentions)
      if (mentionError.error) {
        console.error('[addCommentAction] Mention insert error:', mentionError.error)
      }
    }

    const issue = await supabase.from('course_issues').select('course_id').eq('id', issueId).single()
    if (issue.data?.course_id) {
      revalidatePath(`/courses/${issue.data.course_id}/issue-log`)
    }

    return comment as IssueComment
  } catch (err) {
    console.error('[addCommentAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to add comment')
  }
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
  try {
    if (!courseId) throw new Error('Course ID is required')

    let query = supabase
      .from('course_issues')
      .select(
        `*,
        created_by_profile:created_by(full_name),
        owner_profile:owner_id(full_name),
        course_issue_comments(id)`
      )
      .eq('course_id', courseId)

    if (filters?.phase) query = query.eq('phase', filters.phase)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.severity) query = query.eq('severity', filters.severity)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[getIssuesForCourseAction] Query error:', error)
      throw new Error(error.message || 'Failed to fetch issues')
    }

    // Transform data to include comment_count
    const transformedData = data?.map((issue: any) => ({
      ...issue,
      comment_count: issue.course_issue_comments?.length || 0,
      course_issue_comments: undefined, // Remove the nested array
    })) || []

    return transformedData as CourseIssue[]
  } catch (err) {
    console.error('[getIssuesForCourseAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to fetch issues')
  }
}

export async function getIssueWithCommentsAction(issueId: string): Promise<CourseIssue & { comments: IssueComment[] }> {
  try {
    if (!issueId) throw new Error('Issue ID is required')

    const { data: issue, error: issueError } = await supabase
      .from('course_issues')
      .select(
        `*,
        created_by_profile:created_by(full_name),
        owner_profile:owner_id(full_name)`
      )
      .eq('id', issueId)
      .single()

    if (issueError) {
      console.error('[getIssueWithCommentsAction] Issue fetch error:', issueError)
      throw new Error(issueError.message || 'Issue not found')
    }

    const { data: comments, error: commentsError } = await supabase
      .from('course_issue_comments')
      .select(
        `*,
        author:author_id(full_name, role),
        mentions:issue_comment_mentions(mentioned_profile_id)`
      )
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('[getIssueWithCommentsAction] Comments fetch error:', commentsError)
      throw new Error(commentsError.message || 'Failed to fetch comments')
    }

    return {
      ...(issue as CourseIssue),
      comments: comments as IssueComment[],
    }
  } catch (err) {
    console.error('[getIssueWithCommentsAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to fetch issue details')
  }
}
