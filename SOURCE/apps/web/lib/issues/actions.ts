'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/context'
import { createClient } from '@supabase/supabase-js'
import { getPostgresPool } from '@/lib/postgres/pool'
import { isPostgresProvider } from '@/lib/repositories/provider'
import { CourseIssue, IssueComment, CreateIssueInput, AddCommentInput, IssueStatus } from './types'
import { transitionCourseStatus } from '@/lib/courses/service'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type IssueRow = CourseIssue

type IssueListRow = IssueRow & {
  created_by_profile_full_name: string | null
  owner_profile_full_name: string | null
  comment_count: string | number
}

type MentionRow = {
  comment_id: string
  mentioned_profile_id: string
}

export type IssueCountSummary = { open: number; resolved: number }

export async function getIssueCountsForCoursesAction(
  courseIds: string[]
): Promise<Map<string, IssueCountSummary>> {
  if (!courseIds.length) return new Map()

  if (isPostgresProvider()) {
    const pool = getPostgresPool()
    const { rows } = await pool.query<{ course_id: string; status: string }>(
      `
        SELECT course_id, status
        FROM course_issues
        WHERE course_id = ANY($1::uuid[])
      `,
      [courseIds],
    )

    const map = new Map<string, IssueCountSummary>()
    for (const row of rows) {
      const existing = map.get(row.course_id) ?? { open: 0, resolved: 0 }
      if (row.status === 'resolved') existing.resolved++
      else existing.open++
      map.set(row.course_id, existing)
    }
    return map
  }

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
  if (isPostgresProvider()) {
    try {
      if (!courseId || !phase) throw new Error('Missing required fields: courseId or phase')
      if (!input.title?.trim()) throw new Error('Issue title is required')
      if (input.title.length > 500) throw new Error('Issue title must be 500 characters or less')

      const ctx = await requireProfile()
      const pool = getPostgresPool()

      const inserted = await pool.query<IssueRow>(
        `
          INSERT INTO course_issues (
            course_id, phase, title, type, severity, description, location, direct_link, owner_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          courseId,
          phase,
          input.title.trim(),
          input.type,
          input.severity,
          input.description?.trim() || null,
          input.location?.trim() || null,
          input.direct_link?.trim() || null,
          input.owner_id || null,
          ctx.profile.id,
        ],
      )
      const data = inserted.rows[0]

      const profileResult = await pool.query<{ full_name: string | null }>(
        'SELECT full_name FROM profiles WHERE id = $1 LIMIT 1',
        [ctx.profile.id],
      )

      try {
        await pool.query(
          `
            INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
            VALUES ($1, $2, $3, true)
          `,
          [data.id, ctx.profile.id, `Issue opened by ${profileResult.rows[0]?.full_name || 'User'}`],
        )
      } catch (commentError) {
        console.error('[createIssueAction] Comment insert error:', commentError)
      }

      if (phase === 'provision') {
        const courseResult = await pool.query<{ status: string }>(
          'SELECT status FROM courses WHERE id = $1 LIMIT 1',
          [courseId],
        )
        const course = courseResult.rows[0]

        if (course?.status === 'sent_to_instructor') {
          try {
            await transitionCourseStatus({
              courseId,
              toStatus: 'instructor_questions',
              note: `Instructor raised a question: ${input.title.trim()}`,
            })
          } catch {
            // Non-fatal: issue is already created; status transition failure shouldn't block
          }
        }
      }

      revalidatePath(`/courses/${courseId}/issue-log`)
      revalidatePath(`/instructor/courses/${courseId}`)
      revalidatePath(`/admin/courses/${courseId}`)
      revalidatePath('/admin')
      return data
    } catch (err) {
      console.error('[createIssueAction] Error:', err)
      throw err instanceof Error ? err : new Error('Failed to create issue')
    }
  }

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
        created_by: ctx.profile.id,
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
      .eq('id', ctx.profile.id)
      .single()

    const commentError = await supabase.from('course_issue_comments').insert({
      issue_id: data.id,
      author_id: ctx.profile.id,
      body: `Issue opened by ${profile?.full_name || 'User'}`,
      is_system_message: true,
    })

    if (commentError.error) {
      console.error('[createIssueAction] Comment insert error:', commentError.error)
    }

    // If instructor creates a provision-phase issue while course is sent_to_instructor,
    // auto-transition to instructor_questions so admin is visibly blocked
    if (phase === 'provision') {
      const { data: course } = await supabase
        .from('courses')
        .select('status')
        .eq('id', courseId)
        .single()

      if (course?.status === 'sent_to_instructor') {
        try {
          await transitionCourseStatus({
            courseId,
            toStatus: 'instructor_questions',
            note: `Instructor raised a question: ${input.title.trim()}`,
          })
        } catch {
          // Non-fatal: issue is already created; status transition failure shouldn't block
        }
      }
    }

    revalidatePath(`/courses/${courseId}/issue-log`)
    revalidatePath(`/instructor/courses/${courseId}`)
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath('/admin')
    return data as CourseIssue
  } catch (err) {
    console.error('[createIssueAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to create issue')
  }
}

export async function updateIssueStatusAction(issueId: string, newStatus: IssueStatus): Promise<CourseIssue> {
  if (isPostgresProvider()) {
    try {
      if (!issueId) throw new Error('Issue ID is required')
      if (!['open', 'in_review', 'resolved'].includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`)
      }

      const ctx = await requireProfile()
      const pool = getPostgresPool()

      const issueResult = await pool.query<{ course_id: string }>(
        'SELECT course_id FROM course_issues WHERE id = $1 LIMIT 1',
        [issueId],
      )
      const issue = issueResult.rows[0]

      if (!issue) {
        throw new Error('Issue not found')
      }

      const isAdmin = ['super_admin', 'admin_full', 'admin_viewer'].includes(ctx.profile.role)
      if (!isAdmin) {
        throw new Error('Only admins can resolve issues')
      }

      const updatedResult = await pool.query<IssueRow>(
        `
          UPDATE course_issues
          SET status = $2, resolved_by = $3, resolved_at = $4, updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          issueId,
          newStatus,
          newStatus === 'resolved' ? ctx.profile.id : null,
          newStatus === 'resolved' ? new Date().toISOString() : null,
        ],
      )
      const updatedIssue = updatedResult.rows[0]

      const statusLabel = newStatus === 'in_review' ? 'In Review' : newStatus === 'resolved' ? 'Resolved' : 'Open'
      const profileResult = await pool.query<{ full_name: string | null }>(
        'SELECT full_name FROM profiles WHERE id = $1 LIMIT 1',
        [ctx.profile.id],
      )

      try {
        await pool.query(
          `
            INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
            VALUES ($1, $2, $3, true)
          `,
          [issueId, ctx.profile.id, `Status changed to ${statusLabel} by ${profileResult.rows[0]?.full_name || 'User'}`],
        )
      } catch (commentError) {
        console.error('[updateIssueStatusAction] Comment insert error:', commentError)
      }

      revalidatePath(`/courses/${issue.course_id}/issue-log`)
      return updatedIssue
    } catch (err) {
      console.error('[updateIssueStatusAction] Error:', err)
      throw err instanceof Error ? err : new Error('Failed to update issue status')
    }
  }

  try {
    if (!issueId) throw new Error('Issue ID is required')
    if (!['open', 'in_review', 'resolved'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`)
    }

    const ctx = await requireProfile()

    // Get the course for this issue
    const { data: issue, error: issueError } = await supabase
      .from('course_issues')
      .select('course_id')
      .eq('id', issueId)
      .single()

    if (issueError || !issue) {
      throw new Error('Issue not found')
    }

    // Only admins can change issue status
    const isAdmin = ['super_admin', 'admin_full', 'admin_viewer'].includes(ctx.profile.role)
    if (!isAdmin) {
      throw new Error('Only admins can resolve issues')
    }

    const { data: updatedIssue, error } = await supabase
      .from('course_issues')
      .update({
        status: newStatus,
        resolved_by: newStatus === 'resolved' ? ctx.profile.id : null,
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
      .eq('id', ctx.profile.id)
      .single()

    const commentError = await supabase.from('course_issue_comments').insert({
      issue_id: issueId,
      author_id: ctx.profile.id,
      body: `Status changed to ${statusLabel} by ${profile?.full_name || 'User'}`,
      is_system_message: true,
    })

    if (commentError.error) {
      console.error('[updateIssueStatusAction] Comment insert error:', commentError.error)
    }

    revalidatePath(`/courses/${issue.course_id}/issue-log`)
    return updatedIssue as CourseIssue
  } catch (err) {
    console.error('[updateIssueStatusAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to update issue status')
  }
}

export async function addCommentAction(issueId: string, input: AddCommentInput): Promise<IssueComment> {
  if (isPostgresProvider()) {
    try {
      if (!issueId) throw new Error('Issue ID is required')
      if (!input.body?.trim()) throw new Error('Comment body is required')
      if (input.body.length > 5000) throw new Error('Comment must be 5000 characters or less')

      const ctx = await requireProfile()
      const pool = getPostgresPool()

      const commentResult = await pool.query<IssueComment>(
        `
          INSERT INTO course_issue_comments (issue_id, author_id, body, is_system_message)
          VALUES ($1, $2, $3, false)
          RETURNING *
        `,
        [issueId, ctx.profile.id, input.body.trim()],
      )
      const comment = commentResult.rows[0]

      if (input.mentions && input.mentions.length > 0) {
        try {
          await pool.query(
            `
              INSERT INTO issue_comment_mentions (comment_id, mentioned_profile_id)
              SELECT $1, UNNEST($2::uuid[])
            `,
            [comment.id, input.mentions],
          )
        } catch (mentionError) {
          console.error('[addCommentAction] Mention insert error:', mentionError)
        }
      }

      const issueResult = await pool.query<{ course_id: string }>(
        'SELECT course_id FROM course_issues WHERE id = $1 LIMIT 1',
        [issueId],
      )
      if (issueResult.rows[0]?.course_id) {
        revalidatePath(`/courses/${issueResult.rows[0].course_id}/issue-log`)
      }

      return comment
    } catch (err) {
      console.error('[addCommentAction] Error:', err)
      throw err instanceof Error ? err : new Error('Failed to add comment')
    }
  }

  try {
    if (!issueId) throw new Error('Issue ID is required')
    if (!input.body?.trim()) throw new Error('Comment body is required')
    if (input.body.length > 5000) throw new Error('Comment must be 5000 characters or less')

    const ctx = await requireProfile()

    const { data: comment, error: commentError } = await supabase
      .from('course_issue_comments')
      .insert({
        issue_id: issueId,
        author_id: ctx.profile.id,
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
  if (isPostgresProvider()) {
    try {
      if (!courseId) throw new Error('Course ID is required')
      const pool = getPostgresPool()
      const clauses = ['i.course_id = $1']
      const values: Array<string> = [courseId]

      if (filters?.phase) { values.push(filters.phase); clauses.push(`i.phase = $${values.length}`) }
      if (filters?.status) { values.push(filters.status); clauses.push(`i.status = $${values.length}`) }
      if (filters?.type) { values.push(filters.type); clauses.push(`i.type = $${values.length}`) }
      if (filters?.severity) { values.push(filters.severity); clauses.push(`i.severity = $${values.length}`) }

      const { rows } = await pool.query<IssueListRow>(
        `
          SELECT
            i.*,
            created_by_profile.full_name AS created_by_profile_full_name,
            owner_profile.full_name AS owner_profile_full_name,
            COUNT(cic.id)::text AS comment_count
          FROM course_issues i
          LEFT JOIN profiles created_by_profile ON created_by_profile.id = i.created_by
          LEFT JOIN profiles owner_profile ON owner_profile.id = i.owner_id
          LEFT JOIN course_issue_comments cic ON cic.issue_id = i.id
          WHERE ${clauses.join(' AND ')}
          GROUP BY i.id, created_by_profile.full_name, owner_profile.full_name
          ORDER BY i.created_at DESC
        `,
        values,
      )

      return rows.map((issue) => ({
        ...issue,
        comment_count: Number(issue.comment_count ?? 0),
        created_by_profile: issue.created_by_profile_full_name
          ? { full_name: issue.created_by_profile_full_name }
          : undefined,
        owner_profile: issue.owner_profile_full_name
          ? { full_name: issue.owner_profile_full_name }
          : undefined,
      }))
    } catch (err) {
      console.error('[getIssuesForCourseAction] Error:', err)
      throw err instanceof Error ? err : new Error('Failed to fetch issues')
    }
  }

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
  if (isPostgresProvider()) {
    try {
      if (!issueId) throw new Error('Issue ID is required')
      const pool = getPostgresPool()

      const issueResult = await pool.query<
        IssueRow & {
          created_by_profile_full_name: string | null
          owner_profile_full_name: string | null
        }
      >(
        `
          SELECT
            i.*,
            created_by_profile.full_name AS created_by_profile_full_name,
            owner_profile.full_name AS owner_profile_full_name
          FROM course_issues i
          LEFT JOIN profiles created_by_profile ON created_by_profile.id = i.created_by
          LEFT JOIN profiles owner_profile ON owner_profile.id = i.owner_id
          WHERE i.id = $1
          LIMIT 1
        `,
        [issueId],
      )

      const issue = issueResult.rows[0]
      if (!issue) {
        throw new Error('Issue not found')
      }

      const commentsResult = await pool.query<
        IssueComment & { author_full_name: string | null; author_role: string | null }
      >(
        `
          SELECT
            c.*,
            p.full_name AS author_full_name,
            p.role AS author_role
          FROM course_issue_comments c
          LEFT JOIN profiles p ON p.id = c.author_id
          WHERE c.issue_id = $1
          ORDER BY c.created_at ASC
        `,
        [issueId],
      )

      const commentIds = commentsResult.rows.map((row) => row.id)
      const mentionMap = new Map<string, Array<{ mentioned_profile_id: string }>>()

      if (commentIds.length > 0) {
        const mentionsResult = await pool.query<MentionRow>(
          `
            SELECT comment_id, mentioned_profile_id
            FROM issue_comment_mentions
            WHERE comment_id = ANY($1::uuid[])
          `,
          [commentIds],
        )

        for (const mention of mentionsResult.rows) {
          const current = mentionMap.get(mention.comment_id) ?? []
          current.push({ mentioned_profile_id: mention.mentioned_profile_id })
          mentionMap.set(mention.comment_id, current)
        }
      }

      const mappedIssue: CourseIssue = {
        ...issue,
        created_by_profile: issue.created_by_profile_full_name
          ? { full_name: issue.created_by_profile_full_name }
          : undefined,
        owner_profile: issue.owner_profile_full_name
          ? { full_name: issue.owner_profile_full_name }
          : undefined,
      }

      const comments: IssueComment[] = commentsResult.rows.map((comment) => ({
        id: comment.id,
        issue_id: comment.issue_id,
        author_id: comment.author_id,
        body: comment.body,
        is_system_message: comment.is_system_message,
        created_at: comment.created_at,
        author: comment.author_full_name
          ? { full_name: comment.author_full_name, role: comment.author_role ?? '' }
          : undefined,
        mentions: mentionMap.get(comment.id) ?? [],
      }))

      return { ...mappedIssue, comments }
    } catch (err) {
      console.error('[getIssueWithCommentsAction] Error:', err)
      throw err instanceof Error ? err : new Error('Failed to fetch issue details')
    }
  }

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
