import type { AdminCourseRow } from "@/lib/admin/queries"
import type { CourseComment } from "@/lib/services/comments"
import type { CourseIssue } from "@/lib/issues/types"
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  ReviewMatrixStatus,
  SyllabusGradebookResponseData,
  SyllabusRowStatus,
} from "@/lib/workspace/types"
import {
  ITEM_LABELS,
  SYLLABUS_ITEM_LABELS,
  GRADEBOOK_ITEM_LABELS,
} from "@/lib/workspace/constants"
import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"

export type CoursePdfData = {
  course: AdminCourseRow
  instructorName: string | null
  meta?: MetadataResponseData
  matrix?: ReviewMatrixResponseData
  syllabus?: SyllabusGradebookResponseData
  metaStatus: "draft" | "submitted" | null
  matrixStatus: "draft" | "submitted" | null
  syllabusStatus: "draft" | "submitted" | null
  issues: CourseIssue[]
  comments: CourseComment[]
  generatedAt: string
}

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

const SECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft saved",
  submitted: "Submitted",
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
}

function fmtDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

function sectionStatusLabel(status: "draft" | "submitted" | null) {
  return status ? SECTION_STATUS_LABELS[status] : "Not started"
}

// ── Layout primitives (explicit light colors so output is print-safe) ─────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="mb-3 border-b border-gray-300 pb-1 text-base font-bold uppercase tracking-wide text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "—"}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-gray-400">{children}</p>
}

export function CoursePdfDocument(props: CoursePdfData) {
  const { course, instructorName, meta, matrix, syllabus, issues, comments, generatedAt } = props

  const courseCode = course.sourceCourseId ?? course.targetCourseId ?? "—"
  const matrixItems = matrix?.items ?? []
  const syllabusItems = syllabus?.syllabus_items ?? []
  const gradebookItems = syllabus?.gradebook_items ?? []

  return (
    <div className="mx-auto max-w-[8in] bg-white px-8 py-8 text-gray-900 print:px-0 print:py-0">
      {/* Header */}
      <header className="mb-8 border-b-2 border-gray-900 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
              CourseBridge — Course Review Report
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {courseCode}
              {course.term ? ` · ${course.term}` : ""}
              {course.department ? ` · ${course.department}` : ""}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>
              Status:{" "}
              <span className="font-semibold text-gray-900">
                {COURSE_STATUS_LABELS[course.status] ?? course.status}
              </span>
            </p>
            <p className="mt-1">Generated {fmtDate(generatedAt)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <Field label="Lead TA" value={course.ta?.name ?? course.ta?.email ?? "Unassigned"} />
          <Field label="Instructor" value={instructorName ?? "Pending"} />
          <Field label="Last Updated" value={fmtDate(course.updatedAt)} />
        </div>
      </header>

      {/* Review progress */}
      <Section title="Review Progress">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Metadata" value={sectionStatusLabel(props.metaStatus)} />
          <Field label="Review Matrix" value={sectionStatusLabel(props.matrixStatus)} />
          <Field label="Syllabus & Gradebook" value={sectionStatusLabel(props.syllabusStatus)} />
        </div>
      </Section>

      {/* Metadata */}
      <Section title="Course Metadata">
        {meta ? (
          <div className="grid grid-cols-2 gap-x-8">
            <Field label="Term" value={meta.term} />
            <Field
              label="Section Numbers"
              value={meta.section_numbers?.length ? meta.section_numbers.join(", ") : "—"}
            />
            <Field
              label="Brightspace URL"
              value={meta.brightspace_url ? <span className="break-all">{meta.brightspace_url}</span> : "—"}
            />
            <Field
              label="Moodle URL"
              value={meta.moodle_url ? <span className="break-all">{meta.moodle_url}</span> : "—"}
            />
            <Field label="Total Time Spent" value={fmtDuration(meta.overall_time_spent_seconds)} />
            <div className="col-span-2">
              <Field
                label="Migration Notes"
                value={
                  meta.migration_notes ? (
                    <span className="whitespace-pre-wrap">{meta.migration_notes}</span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </div>
        ) : (
          <Empty>No metadata submitted.</Empty>
        )}
      </Section>

      {/* Review matrix */}
      <Section title="Review Matrix">
        {matrixItems.length ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-[10px] uppercase tracking-wide text-gray-500">
                <th className="py-1.5 pr-2 font-semibold">Item</th>
                <th className="py-1.5 pr-2 font-semibold">Status</th>
                <th className="py-1.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {matrixItems.map((item) => (
                <tr key={item.item_id} className="border-b border-gray-100 align-top break-inside-avoid">
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{item.item_id}</span>
                    <div className="text-xs text-gray-600">{ITEM_LABELS[item.item_id] ?? ""}</div>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {MATRIX_STATUS_LABELS[item.status] ?? item.status}
                  </td>
                  <td className="py-2 text-xs text-gray-700">
                    {item.notes ? <span className="whitespace-pre-wrap">{item.notes}</span> : "—"}
                    {item.direct_link ? (
                      <div className="break-all text-gray-500">{item.direct_link}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No review matrix submitted.</Empty>
        )}
      </Section>

      {/* Syllabus */}
      <Section title="Syllabus Review">
        {syllabusItems.length ? (
          <ItemStatusTable
            rows={syllabusItems.map((i) => ({
              id: i.item_id,
              label: SYLLABUS_ITEM_LABELS[i.item_id] ?? "",
              status: SYLLABUS_STATUS_LABELS[i.ta_status] ?? i.ta_status,
              notes: i.notes,
              link: i.direct_link,
            }))}
          />
        ) : (
          <Empty>No syllabus review submitted.</Empty>
        )}
      </Section>

      {/* Gradebook */}
      <Section title="Gradebook Review">
        {gradebookItems.length ? (
          <ItemStatusTable
            rows={gradebookItems.map((i) => ({
              id: i.item_id,
              label: GRADEBOOK_ITEM_LABELS[i.item_id] ?? "",
              status: MATRIX_STATUS_LABELS[i.status] ?? i.status,
              notes: i.notes,
              link: i.direct_link,
            }))}
          />
        ) : (
          <Empty>No gradebook review submitted.</Empty>
        )}
      </Section>

      {/* Issues */}
      <Section title={`Issues (${issues.length})`}>
        {issues.length ? (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="break-inside-avoid rounded border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{issue.title}</p>
                  <p className="whitespace-nowrap text-[10px] uppercase tracking-wide text-gray-500">
                    {issue.severity} · {issue.status}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">
                  {issue.type}
                  {issue.location ? ` · ${issue.location}` : ""}
                </p>
                {issue.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">{issue.description}</p>
                ) : null}
                {issue.direct_link ? (
                  <p className="mt-1 break-all text-xs text-gray-500">{issue.direct_link}</p>
                ) : null}
                <p className="mt-1 text-[10px] text-gray-400">
                  Raised by {issue.created_by_profile?.full_name ?? "—"} on {fmtDate(issue.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No issues logged.</Empty>
        )}
      </Section>

      {/* Comments */}
      <Section title={`Comments (${comments.length})`}>
        {comments.length ? (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="break-inside-avoid border-b border-gray-100 pb-2">
                <div className="flex items-baseline justify-between gap-3 text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">
                    {c.author_name ?? c.author_email ?? "Unknown"}
                    {c.author_role ? ` · ${c.author_role}` : ""}
                  </span>
                  <span>
                    {c.visibility === "instructor_visible" ? "Instructor-visible" : "Internal"} · {fmtDate(c.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{c.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No comments.</Empty>
        )}
      </Section>

      <footer className="mt-10 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-400">
        CourseBridge · {course.title} · Generated {fmtDate(generatedAt)}
      </footer>
    </div>
  )
}

function ItemStatusTable({
  rows,
}: {
  rows: Array<{ id: string; label: string; status: string; notes?: string; link?: string }>
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-300 text-left text-[10px] uppercase tracking-wide text-gray-500">
          <th className="py-1.5 pr-2 font-semibold">Item</th>
          <th className="py-1.5 pr-2 font-semibold">Status</th>
          <th className="py-1.5 font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-gray-100 align-top break-inside-avoid">
            <td className="py-2 pr-2">
              <span className="font-semibold">{row.id}</span>
              <div className="text-xs text-gray-600">{row.label}</div>
            </td>
            <td className="py-2 pr-2 whitespace-nowrap">{row.status}</td>
            <td className="py-2 text-xs text-gray-700">
              {row.notes ? <span className="whitespace-pre-wrap">{row.notes}</span> : "—"}
              {row.link ? <div className="break-all text-gray-500">{row.link}</div> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
