import { createClient } from '@supabase/supabase-js'
import { getPostgresPool } from '@/lib/postgres/pool'
import { isPostgresProvider } from '@/lib/repositories/provider'
import { CourseIssue } from './types'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type IssueSearchRow = CourseIssue & {
  created_by_profile_full_name: string | null
  owner_profile_full_name: string | null
  comment_count: string | number
}

function mapIssueRow(issue: IssueSearchRow): CourseIssue {
  return {
    ...issue,
    created_by_profile: issue.created_by_profile_full_name
      ? { full_name: issue.created_by_profile_full_name }
      : undefined,
    owner_profile: issue.owner_profile_full_name
      ? { full_name: issue.owner_profile_full_name }
      : undefined,
    comment_count: Number(issue.comment_count ?? 0),
  }
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

    if (isPostgresProvider()) {
      const pool = getPostgresPool()
      const clauses = ['i.course_id = $1']
      const values: string[] = [courseId]

      if (searchQuery?.trim()) {
        const searchTerm = `%${searchQuery.trim().toLowerCase()}%`
        values.push(searchTerm)
        const searchParam = `$${values.length}`
        clauses.push(`(LOWER(i.title) LIKE ${searchParam} OR LOWER(COALESCE(i.description, '')) LIKE ${searchParam})`)
      }
      if (filters?.phase) { values.push(filters.phase); clauses.push(`i.phase = $${values.length}`) }
      if (filters?.status) { values.push(filters.status); clauses.push(`i.status = $${values.length}`) }
      if (filters?.type) { values.push(filters.type); clauses.push(`i.type = $${values.length}`) }
      if (filters?.severity) { values.push(filters.severity); clauses.push(`i.severity = $${values.length}`) }

      const { rows } = await pool.query<IssueSearchRow>(
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
      return rows.map(mapIssueRow)
    }

    let query = supabase
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

    if (isPostgresProvider()) {
      const pool = getPostgresPool()
      const { rows } = await pool.query<IssueSearchRow>(
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
          WHERE i.course_id = $1
          GROUP BY i.id, created_by_profile.full_name, owner_profile.full_name
          ORDER BY i.created_at DESC
          LIMIT $2
        `,
        [courseId, limit],
      )
      return rows.map(mapIssueRow)
    }

    const { data, error } = await supabase
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

    if (isPostgresProvider()) {
      const pool = getPostgresPool()
      const { rows } = await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM course_issues
          WHERE course_id = $1 AND status = 'open'
        `,
        [courseId],
      )
      return Number(rows[0]?.count ?? 0)
    }

    const { count, error } = await supabase
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
