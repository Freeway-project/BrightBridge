'use server'

import { getPostgresPool } from '@/lib/postgres/pool'

export async function notifyMentionedUsersAction(
  issueId: string,
  commentId: string,
  mentionedProfileIds: string[],
  mentionerName: string
): Promise<void> {
  try {
    if (!issueId || !commentId) throw new Error('Issue ID and comment ID are required')
    if (!mentionedProfileIds || mentionedProfileIds.length === 0) return

    const pool = getPostgresPool()
    const issueResult = await pool.query<{ id: string; title: string; course_id: string; phase: string }>(
      'SELECT id, title, course_id, phase FROM course_issues WHERE id = $1 LIMIT 1',
      [issueId],
    )
    const issue = issueResult.rows[0] ?? null

    if (!issue) {
      console.error('[notifyMentionedUsersAction] Failed to fetch issue for mention notification')
      return
    }

    // In a production system, this would send notifications via:
    // - In-app notifications (create notification records in DB)
    // - Email notifications
    // - Push notifications
    // For now, we just log the mention for audit purposes

    console.log('[notifyMentionedUsersAction] Mentions:', {
      issue_id: issueId,
      comment_id: commentId,
      issue_title: issue?.title,
      mentioned_count: mentionedProfileIds.length,
      mentioner: mentionerName,
      phase: issue?.phase,
    })

    // TODO: Implement notification system
  } catch (err) {
    console.error('[notifyMentionedUsersAction] Error:', err)
    // Don't throw - notifications are non-critical
  }
}

export async function getUnreadMentionsAction(userId: string): Promise<number> {
  try {
    if (!userId) throw new Error('User ID is required')

    const pool = getPostgresPool()
    const { rows } = await pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM issue_comment_mentions
        WHERE mentioned_profile_id = $1
      `,
      [userId],
    )
    return Number(rows[0]?.count ?? 0)
  } catch (err) {
    console.error('[getUnreadMentionsAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to get mentions count')
  }
}

export async function getMentionsForUserAction(userId: string, limit = 20): Promise<
  Array<{
    comment_id: string
    issue_id: string
    issue_title: string
    comment_author: string
    course_id: string
    created_at: string
  }>
> {
  try {
    if (!userId) throw new Error('User ID is required')

    const pool = getPostgresPool()
    const { rows } = await pool.query<{
      comment_id: string
      issue_id: string
      issue_title: string | null
      comment_author: string | null
      course_id: string
      created_at: string
    }>(
      `
        SELECT
          c.id AS comment_id,
          c.issue_id,
          i.title AS issue_title,
          p.full_name AS comment_author,
          i.course_id,
          c.created_at
        FROM issue_comment_mentions m
        INNER JOIN course_issue_comments c ON c.id = m.comment_id
        INNER JOIN course_issues i ON i.id = c.issue_id
        LEFT JOIN profiles p ON p.id = c.author_id
        WHERE m.mentioned_profile_id = $1
        ORDER BY c.created_at DESC
        LIMIT $2
      `,
      [userId, limit],
    )

    return rows.map((row) => ({
      comment_id: row.comment_id,
      issue_id: row.issue_id,
      issue_title: row.issue_title ?? 'Untitled issue',
      comment_author: row.comment_author ?? 'Unknown user',
      course_id: row.course_id,
      created_at: row.created_at,
    }))
  } catch (err) {
    console.error('[getMentionsForUserAction] Error:', err)
    return []
  }
}
