'use server'

import { getPostgresPool } from '@/lib/postgres/pool'

export async function notifyMentionedUsersAction(
  _issueId: string,
  _commentId: string,
  _mentionedProfileIds: string[],
  _mentionerName: string
): Promise<void> {
  // Mention notifications are surfaced at query time in
  // lib/notifications/queries.ts (getMentionNotifications).
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
