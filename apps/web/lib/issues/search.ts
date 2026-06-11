import { createClient } from '@supabase/supabase-js'
import { CourseIssue } from './types'

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function searchIssuesAction(
  courseId: string,
  searchQuery: string,
  filters?: {
    phase?: 'migration' | 'staging' | 'provision'
    status?: string
    type?: string
    severity?: string
  }
): Promise<CourseIssue[]> {
  try {
    if (!courseId) throw new Error('Course ID is required')

    let query = getClient()
      .from('course_issues')
      .select(
        `*,
        created_by_profile:created_by(full_name),
        owner_profile:owner_id(full_name),
        comment_count:course_issue_comments(count)`
      )
      .eq('course_id', courseId)

    // Full-text search across title and description
    if (searchQuery?.trim()) {
      const searchTerm = `%${searchQuery.trim().toLowerCase()}%`
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    }

    // Apply filters
    if (filters?.phase) query = query.eq('phase', filters.phase)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.severity) query = query.eq('severity', filters.severity)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[searchIssuesAction] Query error:', error)
      throw new Error(error.message || 'Failed to search issues')
    }

    return data as CourseIssue[]
  } catch (err) {
    console.error('[searchIssuesAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to search issues')
  }
}

export async function getRecentIssuesAction(courseId: string, limit = 10): Promise<CourseIssue[]> {
  try {
    if (!courseId) throw new Error('Course ID is required')

    const { data, error } = await getClient()
      .from('course_issues')
      .select(
        `*,
        created_by_profile:created_by(full_name),
        owner_profile:owner_id(full_name),
        comment_count:course_issue_comments(count)`
      )
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getRecentIssuesAction] Query error:', error)
      throw new Error(error.message || 'Failed to fetch recent issues')
    }

    return data as CourseIssue[]
  } catch (err) {
    console.error('[getRecentIssuesAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to fetch recent issues')
  }
}

export async function getOpenIssuesCountAction(courseId: string): Promise<number> {
  try {
    if (!courseId) throw new Error('Course ID is required')

    const { count, error } = await getClient()
      .from('course_issues')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'open')

    if (error) {
      console.error('[getOpenIssuesCountAction] Query error:', error)
      throw new Error(error.message || 'Failed to get open issues count')
    }

    return count || 0
  } catch (err) {
    console.error('[getOpenIssuesCountAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to get open issues count')
  }
}
