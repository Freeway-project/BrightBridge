'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface MentionNotification {
  issued_id: string
  comment_id: string
  mentioner_id: string
  mentioner_name: string
  issue_title: string
  course_id: string
  phase: string
}

export async function notifyMentionedUsersAction(
  issueId: string,
  commentId: string,
  mentionedProfileIds: string[],
  mentionerName: string
): Promise<void> {
  try {
    if (!issueId || !commentId) throw new Error('Issue ID and comment ID are required')
    if (!mentionedProfileIds || mentionedProfileIds.length === 0) return

    // Get issue context
    const { data: issue, error: issueError } = await supabase
      .from('course_issues')
      .select('id, title, course_id, phase')
      .eq('id', issueId)
      .single()

    if (issueError) {
      console.error('[notifyMentionedUsersAction] Failed to fetch issue:', issueError)
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
    // This could be done via:
    // 1. Database notifications table (records to be read by UI)
    // 2. Email service integration
    // 3. Push notification service
  } catch (err) {
    console.error('[notifyMentionedUsersAction] Error:', err)
    // Don't throw - notifications are non-critical
  }
}

export async function getUnreadMentionsAction(userId: string): Promise<number> {
  try {
    if (!userId) throw new Error('User ID is required')

    // Get count of comments where user is mentioned but hasn't viewed
    const { count, error } = await supabase
      .from('issue_comment_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('mentioned_profile_id', userId)
      // TODO: Add viewed_at column to track which mentions have been read

    if (error) {
      console.error('[getUnreadMentionsAction] Query error:', error)
      throw new Error(error.message || 'Failed to get mentions count')
    }

    return count || 0
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

    const { data, error } = await supabase
      .rpc('get_user_mentions', {
        p_user_id: userId,
        p_limit: limit,
      })

    if (error) {
      console.error('[getMentionsForUserAction] Query error:', error)
      // RPC might not exist yet, so return empty array gracefully
      return []
    }

    return data || []
  } catch (err) {
    console.error('[getMentionsForUserAction] Error:', err)
    return []
  }
}
