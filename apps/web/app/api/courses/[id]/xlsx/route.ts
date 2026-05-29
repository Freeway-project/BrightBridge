import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getAuthContext } from "@/lib/auth/context"
import { getCourseExportData } from "@/lib/admin/course-export"
import {
  ITEM_LABELS,
  SYLLABUS_ITEM_LABELS,
  GRADEBOOK_ITEM_LABELS,
} from "@/lib/workspace/constants"
import type { ReviewMatrixStatus, SyllabusRowStatus } from "@/lib/workspace/types"
import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"

// exceljs relies on Node APIs, so this route must run on the Node.js runtime.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MATRIX_STATUS_LABELS: Record<ReviewMatrixStatus, string> = {
  pass: "Pass",
  fix_needed: "Fix needed",
  missing: "Missing",
  escalate: "Escalate",
  na: "N/A",
}

const SYLLABUS_STATUS_LABELS: Record<SyllabusRowStatus, string> = {
  confirmed: "Confirmed",
  fix_needed: "Fix needed",
  pending: "Pending",
}

function sectionStatusLabel(status: "draft" | "submitted" | null) {
  if (status === "submitted") return "Submitted"
  if (status === "draft") return "Draft saved"
  return "Not started"
}

function fmtDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "course"
}

/** Add a worksheet with a bold, frozen header row. */
function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width?: number }>,
) {
  const ws = wb.addWorksheet(name)
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 24 }))
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  return ws
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const context = await getAuthContext()
  if (context.kind !== "profile") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["admin_full", "super_admin"].includes(context.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const data = await getCourseExportData(id)
  if (!data) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  const { course, instructorName, meta, matrix, syllabus, issues, comments } = data
  const courseCode = course.sourceCourseId ?? course.targetCourseId ?? ""

  const wb = new ExcelJS.Workbook()
  wb.creator = "CourseBridge"
  wb.created = new Date()

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = addSheet(wb, "Summary", [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 60 },
  ])
  const summaryRows: Array<[string, string]> = [
    ["Course Code", courseCode],
    ["Title", course.title],
    ["Term", course.term ?? ""],
    ["Department", course.department ?? ""],
    ["Status", COURSE_STATUS_LABELS[course.status] ?? course.status],
    ["Lead TA", course.ta?.name ?? course.ta?.email ?? "Unassigned"],
    ["Instructor", instructorName ?? "Pending"],
    ["Last Updated", fmtDate(course.updatedAt)],
    ["Metadata Section", sectionStatusLabel(data.metaStatus)],
    ["Review Matrix Section", sectionStatusLabel(data.matrixStatus)],
    ["Syllabus & Gradebook Section", sectionStatusLabel(data.syllabusStatus)],
    ["Generated At", new Date().toISOString()],
  ]
  for (const [field, value] of summaryRows) summary.addRow({ field, value })

  // ── Metadata ─────────────────────────────────────────────────────────────--
  const metaSheet = addSheet(wb, "Metadata", [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 70 },
  ])
  const metaRows: Array<[string, string]> = [
    ["Term", meta?.term ?? ""],
    ["Section Numbers", meta?.section_numbers?.join(", ") ?? ""],
    ["Brightspace URL", meta?.brightspace_url ?? ""],
    ["Moodle URL", meta?.moodle_url ?? ""],
    ["Total Time Spent (s)", meta?.overall_time_spent_seconds != null ? String(meta.overall_time_spent_seconds) : ""],
    ["Migration Notes", meta?.migration_notes ?? ""],
  ]
  for (const [field, value] of metaRows) metaSheet.addRow({ field, value })

  // ── Review Matrix ────────────────────────────────────────────────────────--
  const matrixSheet = addSheet(wb, "Review Matrix", [
    { header: "Item", key: "item", width: 10 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 16 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Direct Link", key: "link", width: 40 },
  ])
  for (const item of matrix?.items ?? []) {
    matrixSheet.addRow({
      item: item.item_id,
      description: ITEM_LABELS[item.item_id] ?? "",
      status: MATRIX_STATUS_LABELS[item.status] ?? item.status,
      notes: item.notes ?? "",
      link: item.direct_link ?? "",
    })
  }

  // ── Syllabus ─────────────────────────────────────────────────────────────--
  const syllabusSheet = addSheet(wb, "Syllabus", [
    { header: "Item", key: "item", width: 10 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 16 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Direct Link", key: "link", width: 40 },
  ])
  for (const item of syllabus?.syllabus_items ?? []) {
    syllabusSheet.addRow({
      item: item.item_id,
      description: SYLLABUS_ITEM_LABELS[item.item_id] ?? "",
      status: SYLLABUS_STATUS_LABELS[item.ta_status] ?? item.ta_status,
      notes: item.notes ?? "",
      link: item.direct_link ?? "",
    })
  }

  // ── Gradebook ────────────────────────────────────────────────────────────--
  const gradebookSheet = addSheet(wb, "Gradebook", [
    { header: "Item", key: "item", width: 10 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 16 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Direct Link", key: "link", width: 40 },
  ])
  for (const item of syllabus?.gradebook_items ?? []) {
    gradebookSheet.addRow({
      item: item.item_id,
      description: GRADEBOOK_ITEM_LABELS[item.item_id] ?? "",
      status: MATRIX_STATUS_LABELS[item.status] ?? item.status,
      notes: item.notes ?? "",
      link: item.direct_link ?? "",
    })
  }

  // ── Issues ───────────────────────────────────────────────────────────────--
  const issuesSheet = addSheet(wb, "Issues", [
    { header: "Title", key: "title", width: 40 },
    { header: "Type", key: "type", width: 16 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Location", key: "location", width: 30 },
    { header: "Description", key: "description", width: 50 },
    { header: "Raised By", key: "raisedBy", width: 24 },
    { header: "Created At", key: "createdAt", width: 24 },
    { header: "Direct Link", key: "link", width: 40 },
  ])
  for (const issue of issues) {
    issuesSheet.addRow({
      title: issue.title,
      type: issue.type,
      severity: issue.severity,
      status: issue.status,
      location: issue.location ?? "",
      description: issue.description ?? "",
      raisedBy: issue.created_by_profile?.full_name ?? "",
      createdAt: fmtDate(issue.created_at),
      link: issue.direct_link ?? "",
    })
  }

  // ── Comments ─────────────────────────────────────────────────────────────--
  const commentsSheet = addSheet(wb, "Comments", [
    { header: "Author", key: "author", width: 24 },
    { header: "Role", key: "role", width: 18 },
    { header: "Visibility", key: "visibility", width: 18 },
    { header: "Created At", key: "createdAt", width: 24 },
    { header: "Comment", key: "body", width: 70 },
  ])
  for (const c of comments) {
    commentsSheet.addRow({
      author: c.author_name ?? c.author_email ?? "Unknown",
      role: c.author_role ?? "",
      visibility: c.visibility === "instructor_visible" ? "Instructor-visible" : "Internal",
      createdAt: fmtDate(c.created_at),
      body: c.body,
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `course-review-${safeFilePart(courseCode || course.title)}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
