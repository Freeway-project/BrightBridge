'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth/context'
import { getPostgresPool } from '@/lib/postgres/pool'
import { CourseIssue, IssueComment, CreateIssueInput, AddCommentInput, IssueStatus } from './types'
import { transitionCourseStatus } from '@/lib/courses/service'

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

export async function updateIssueStatusAction(issueId: string, newStatus: IssueStatus): Promise<CourseIssue> {
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

    const isAdmin = ['super_admin', 'admin_full'].includes(ctx.profile.role)
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

export async function addCommentAction(issueId: string, input: AddCommentInput): Promise<IssueComment> {
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

export async function getIssuesForCourseAction(
  courseId: string,
  filters?: {
    phase?: 'migration' | 'staging' | 'provision' | Array<'migration' | 'staging' | 'provision'>
    status?: IssueStatus
    type?: string
    severity?: string
  }
): Promise<CourseIssue[]> {
  try {
    if (!courseId) throw new Error('Course ID is required')
    const pool = getPostgresPool()
    const clauses = ['i.course_id = $1']
    const values: Array<string | string[]> = [courseId]

    if (filters?.phase) {
      if (Array.isArray(filters.phase)) {
        values.push(filters.phase)
        clauses.push(`i.phase = ANY($${values.length}::text[])`)
      } else {
        values.push(filters.phase)
        clauses.push(`i.phase = $${values.length}`)
      }
    }
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

export async function getIssueWithCommentsAction(issueId: string): Promise<CourseIssue & { comments: IssueComment[] }> {
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
