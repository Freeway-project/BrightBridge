import "server-only"

import { getPostgresPool } from "@/lib/postgres/pool"
import { getCourseRepository } from "@/lib/repositories"
import type { SuperAdminCourseRow } from "@/lib/repositories/contracts"

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

/**
 * Courses enriched with per-section review status and issue counts.
 * `search` filters the course set; the aggregate lookups are by course id.
 */
export async function getCoursesForExport(search = ""): Promise<CourseExportRow[]> {
  const pool = getPostgresPool()

  const [courses, sectionsResult, responsesResult, issuesResult] = await Promise.all([
    getAllSuperAdminCourses(search),
    pool.query<{ id: string; key: string }>("SELECT id, key FROM review_sections"),
    pool.query<{ course_id: string; section_id: string; status: string }>(
      "SELECT course_id, section_id, status FROM review_responses",
    ),
    pool.query<{ course_id: string; status: string }>(
      "SELECT course_id, status FROM course_issues",
    ),
  ])

  const sectionKeyById = new Map<string, string>()
  for (const s of sectionsResult.rows) sectionKeyById.set(s.id, s.key)

  const sectionStatus = new Map<
    string,
    { metadata: SectionStatus; matrix: SectionStatus; syllabus: SectionStatus }
  >()
  for (const r of responsesResult.rows) {
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
  for (const i of issuesResult.rows) {
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
