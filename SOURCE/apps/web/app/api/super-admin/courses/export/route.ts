import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getAuthContext } from "@/lib/auth/context"
import { addSheet } from "@/lib/exports/xlsx"
import { getCoursesForExport, type SectionStatus } from "@/lib/super-admin/course-export-data"
import { COURSE_STATUS_LABELS, getPipelineStage } from "@coursebridge/workflow"

// ExcelJS relies on Node APIs, so this route must run on the Node.js runtime.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sectionLabel(status: SectionStatus) {
  if (status === "submitted") return "Submitted"
  if (status === "draft") return "Draft saved"
  return "Not started"
}

function fmtDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const context = await getAuthContext()
  if (context.kind !== "profile") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["admin_full", "super_admin"].includes(context.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const search = new URL(req.url).searchParams.get("search") ?? ""
  const courses = await getCoursesForExport(search)

  const wb = new ExcelJS.Workbook()
  wb.creator = "CourseBridge"
  wb.created = new Date()

  const sheet = addSheet(wb, "Courses", [
    { header: "Code", key: "code", width: 16 },
    { header: "Title", key: "title", width: 44 },
    { header: "Status", key: "status", width: 22 },
    { header: "Phase", key: "phase", width: 12 },
    { header: "Term", key: "term", width: 14 },
    { header: "Department", key: "department", width: 22 },
    { header: "TA", key: "taName", width: 22 },
    { header: "TA Email", key: "taEmail", width: 28 },
    { header: "Instructor", key: "instructorName", width: 22 },
    { header: "Instructor Email", key: "instructorEmail", width: 28 },
    { header: "Metadata", key: "metadata", width: 14 },
    { header: "Review Matrix", key: "matrix", width: 14 },
    { header: "Syllabus/Gradebook", key: "syllabus", width: 18 },
    { header: "Open Issues", key: "openIssues", width: 12 },
    { header: "Resolved Issues", key: "resolvedIssues", width: 14 },
    { header: "Created", key: "created", width: 14 },
    { header: "Last Updated", key: "updated", width: 14 },
  ])

  for (const c of courses) {
    sheet.addRow({
      code: c.code ?? "",
      title: c.title,
      status: COURSE_STATUS_LABELS[c.status] ?? c.status,
      phase: getPipelineStage(c.status),
      term: c.term ?? "",
      department: c.department ?? "",
      taName: c.ta?.name ?? c.ta?.email ?? "Unassigned",
      taEmail: c.ta?.email ?? "",
      instructorName: c.instructor?.name ?? c.instructor?.email ?? "Pending",
      instructorEmail: c.instructor?.email ?? "",
      metadata: sectionLabel(c.metadataStatus),
      matrix: sectionLabel(c.matrixStatus),
      syllabus: sectionLabel(c.syllabusStatus),
      openIssues: c.openIssues,
      resolvedIssues: c.resolvedIssues,
      created: fmtDate(c.created_at),
      updated: fmtDate(c.updated_at),
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="courses-all-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
