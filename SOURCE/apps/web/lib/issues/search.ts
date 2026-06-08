import { getPostgresPool } from '@/lib/postgres/pool'
import { CourseIssue } from './types'

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
    const pool = getPostgresPool()
    const clauses = ['i.course_id = $1']
    const values: string[] = [courseId]

    if (searchQuery?.trim()) {
      const searchTerm = `%${searchQuery.trim().toLowerCase()}%`
      values.push(searchTerm)
      const searchParam = `$${values.length}`
      clauses.push(`(LOWER(i.title) LIKE ${searchParam} OR LOWER(COALESCE(i.description, '')) LIKE ${searchParam})`)
    }

    if (filters?.phase) {
      values.push(filters.phase)
      clauses.push(`i.phase = $${values.length}`)
    }
    if (filters?.status) {
      values.push(filters.status)
      clauses.push(`i.status = $${values.length}`)
    }
    if (filters?.type) {
      values.push(filters.type)
      clauses.push(`i.type = $${values.length}`)
    }
    if (filters?.severity) {
      values.push(filters.severity)
      clauses.push(`i.severity = $${values.length}`)
    }

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
  } catch (err) {
    console.error('[searchIssuesAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to search issues')
  }
}

export async function getRecentIssuesAction(courseId: string, limit = 10): Promise<CourseIssue[]> {
  try {
    if (!courseId) throw new Error('Course ID is required')
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
  } catch (err) {
    console.error('[getRecentIssuesAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to fetch recent issues')
  }
}

export async function getOpenIssuesCountAction(courseId: string): Promise<number> {
  try {
    if (!courseId) throw new Error('Course ID is required')
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
  } catch (err) {
    console.error('[getOpenIssuesCountAction] Error:', err)
    throw err instanceof Error ? err : new Error('Failed to get open issues count')
  }
}
