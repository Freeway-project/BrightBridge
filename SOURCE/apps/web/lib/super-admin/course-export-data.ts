import "server-only"

import { getCourseRepository } from "@/lib/repositories"
import { getPostgresPool } from "@/lib/postgres/pool"
import type { SuperAdminCourseRow } from "@/lib/repositories/contracts"

/**
 * Bulk data assembly for the "Export All Courses" feature (super-admin Courses tab).
 *
 * Everything here is aggregate — three table scans, no per-course N+1 — so it stays
 * fast even across the full portfolio (~2400+ courses). Both the Excel route and the
 * PDF print page consume these helpers so the two surfaces stay in sync.
 */

export type SectionStatus = "draft" | "submitted" | null

export type CourseExportRow = SuperAdminCourseRow & {
  metadataStatus: SectionStatus
  matrixStatus: SectionStatus
  syllabusStatus: SectionStatus
  openIssues: number
  resolvedIssues: number
}

const PAGE_SIZE = 1000

/** Fetch every course by looping the existing paginated super-admin query. */
export async function getAllSuperAdminCourses(search = ""): Promise<SuperAdminCourseRow[]> {
  const repo = getCourseRepository()
  const all: SuperAdminCourseRow[] = []
  let page = 1

  for (;;) {
    const res = await repo.listSuperAdminCourses(page, PAGE_SIZE, search)
    all.push(...res.data)
    if (res.data.length === 0 || all.length >= res.total) break
    page += 1
  }

  return all
}

/** Bulk row fetch over a whole table — `table` and `columns` are internal constants. */
async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const pool = getPostgresPool()
  const { rows } = await pool.query(`SELECT ${columns} FROM ${table}`)
  return rows as T[]
}

/**
 * Courses enriched with per-section review status and issue counts.
 * `search` filters the course set (matching the table filter); the aggregate
 * lookups are by course id, so unrelated aggregate rows are simply ignored.
 */
export async function getCoursesForExport(search = ""): Promise<CourseExportRow[]> {
  const [courses, sections, responses, issues] = await Promise.all([
    getAllSuperAdminCourses(search),
    fetchAllRows<{ id: string; key: string }>("review_sections", "id, key"),
    fetchAllRows<{ course_id: string; section_id: string; status: string }>(
      "review_responses",
      "course_id, section_id, status",
    ),
    fetchAllRows<{ course_id: string; status: string }>("course_issues", "course_id, status"),
  ])

  const sectionKeyById = new Map<string, string>()
  for (const s of sections) sectionKeyById.set(s.id, s.key)

  const sectionStatus = new Map<
    string,
    { metadata: SectionStatus; matrix: SectionStatus; syllabus: SectionStatus }
  >()
  for (const r of responses) {
    const key = sectionKeyById.get(r.section_id)
    if (!key) continue
    const cur = sectionStatus.get(r.course_id) ?? { metadata: null, matrix: null, syllabus: null }
    const st: SectionStatus = r.status === "submitted" ? "submitted" : "draft"
    if (key === "course_metadata") cur.metadata = st
    else if (key === "review_matrix") cur.matrix = st
    else if (key === "syllabus_review") cur.syllabus = st
    sectionStatus.set(r.course_id, cur)
  }

  const issueCounts = new Map<string, { open: number; resolved: number }>()
  for (const i of issues) {
    const cur = issueCounts.get(i.course_id) ?? { open: 0, resolved: 0 }
    if (i.status === "resolved") cur.resolved += 1
    else cur.open += 1
    issueCounts.set(i.course_id, cur)
  }

  return courses.map((c) => {
    const ss = sectionStatus.get(c.id)
    const ic = issueCounts.get(c.id)
    return {
      ...c,
      metadataStatus: ss?.metadata ?? null,
      matrixStatus: ss?.matrix ?? null,
      syllabusStatus: ss?.syllabus ?? null,
      openIssues: ic?.open ?? 0,
      resolvedIssues: ic?.resolved ?? 0,
    }
  })
}
