"use client"

import { useState } from "react"
import type { AdminCourseRow } from "@/lib/admin/queries"
import type { ReviewResponse } from "@/lib/services/review"
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  SyllabusGradebookResponseData,
  IssueLogResponseData,
} from "@/lib/workspace/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export function CourseReviewDetail({ responses, sectionKeyById }: Props) {
  const byKey: Record<string, ReviewResponse> = {}
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey[key] = r
  }

  const meta = byKey["course_metadata"]?.response_data as MetadataResponseData | undefined
  const matrix = byKey["review_matrix"]?.response_data as ReviewMatrixResponseData | undefined
  const syllabus = byKey["syllabus_review"]?.response_data as SyllabusGradebookResponseData | undefined
  const notes = byKey["general_notes"]?.response_data as IssueLogResponseData | undefined

  const metaStatus = byKey["course_metadata"]?.status ?? null
  const matrixStatus = byKey["review_matrix"]?.status ?? null
  const syllabusStatus = byKey["syllabus_review"]?.status ?? null

  return (
    <div className="space-y-4">
      <MetadataCard data={meta} responseStatus={metaStatus} />
      <ReviewMatrixCard data={matrix} responseStatus={matrixStatus} />
      <SyllabusCard data={syllabus} responseStatus={syllabusStatus} />
      <IssueLogCard data={notes} />
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionStatusChip({ responseStatus }: { responseStatus: "draft" | "submitted" | null }) {
  if (responseStatus === "submitted")
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20">Submitted</Badge>
  if (responseStatus === "draft")
    return <Badge variant="outline" className="text-orange-600 border-orange-400/40">Draft</Badge>
  return <Badge variant="outline" className="text-muted-foreground">Not started</Badge>
}

function CollapsibleCard({
  title,
  chip,
  children,
  defaultOpen = true,
}: {
  title: string
  chip: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            {title}
          </CardTitle>
          {chip}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-all">{value}</p>
    </div>
  )
}

// ── Section cards ─────────────────────────────────────────────────────────────

function MetadataCard({
  data,
  responseStatus,
}: {
  data: MetadataResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  return (
    <CollapsibleCard title="Metadata" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Term" value={data.term} />
          <Field
            label="Sections"
            value={data.section_numbers?.length ? data.section_numbers.join(", ") : null}
          />
          <Field label="Brightspace URL" value={data.brightspace_url} />
          <Field label="Moodle URL" value={data.moodle_url} />
          <div className="sm:col-span-2">
            <Field label="Migration Notes" value={data.migration_notes} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data saved yet.</p>
      )}
    </CollapsibleCard>
  )
}

const STATUS_LABEL: Record<string, string> = {
  pass: "Pass",
  fix_needed: "Fix Needed",
  missing: "Missing",
  escalate: "Escalate",
  na: "N/A",
}

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600",
  fix_needed: "text-orange-600",
  missing: "text-red-600",
  escalate: "text-purple-600",
  na: "text-muted-foreground",
}

function ReviewMatrixCard({
  data,
  responseStatus,
}: {
  data: ReviewMatrixResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const items = data?.items ?? []
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {})

  const flagged = items.filter((i) => i.status !== "pass" && i.status !== "na")

  return (
    <CollapsibleCard title="Review Matrix" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {items.length > 0 ? (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(counts).map(([status, count]) => (
              <span key={status} className={cn("text-sm font-medium", STATUS_COLOR[status])}>
                {count} {STATUS_LABEL[status] ?? status}
              </span>
            ))}
          </div>

          {/* Flagged items */}
          {flagged.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items needing attention</p>
              {flagged.map((item) => (
                <div key={item.item_id} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium", STATUS_COLOR[item.status])}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.item_id}</span>
                  </div>
                  {item.notes && <p className="text-sm text-foreground pl-1">{item.notes}</p>}
                  {item.direct_link && (
                    <a
                      href={item.direct_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline pl-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.direct_link}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data saved yet.</p>
      )}
    </CollapsibleCard>
  )
}

const SYLLABUS_STATUS_ICON: Record<string, string> = {
  confirmed: "✓",
  fix_needed: "⚠",
  pending: "—",
}

const SYLLABUS_STATUS_COLOR: Record<string, string> = {
  confirmed: "text-green-600",
  fix_needed: "text-orange-600",
  pending: "text-muted-foreground",
}

function SyllabusCard({
  data,
  responseStatus,
}: {
  data: SyllabusGradebookResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const syllabusItems = data?.syllabus_items ?? []
  const gradebookItems = data?.gradebook_items ?? []

  return (
    <CollapsibleCard title="Syllabus & Gradebook" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {data ? (
        <div className="space-y-5">
          {data.instructor_email && (
            <Field label="Instructor" value={data.instructor_email} />
          )}

          {syllabusItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Syllabus Items</p>
              {syllabusItems.map((item) => (
                <div key={item.item_id} className="flex items-start gap-2">
                  <span className={cn("w-4 shrink-0 text-sm font-bold", SYLLABUS_STATUS_COLOR[item.ta_status])}>
                    {SYLLABUS_STATUS_ICON[item.ta_status] ?? "—"}
                  </span>
                  <div>
                    <p className="text-sm text-foreground">{item.item_id}</p>
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {gradebookItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gradebook Items</p>
              {gradebookItems.map((item) => (
                <div key={item.item_id} className="flex items-start gap-2">
                  <span className={cn("w-4 shrink-0 text-sm font-bold", STATUS_COLOR[item.status])}>
                    {item.status === "pass" ? "✓" : item.status === "na" ? "—" : "⚠"}
                  </span>
                  <div>
                    <p className="text-sm text-foreground">{item.item_id}</p>
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data saved yet.</p>
      )}
    </CollapsibleCard>
  )
}

function IssueLogCard({ data }: { data: IssueLogResponseData | undefined }) {
  const issues = data?.issues ?? []
  const open = issues.filter((i) => i.status === "open" || i.status === "escalated")
  const resolved = issues.filter((i) => i.status === "fixed" || i.status === "resolved")

  const bySeverity = (list: typeof issues, sev: string) =>
    list.filter((i) => i.severity === sev).length

  return (
    <CollapsibleCard
      title="Issue Log"
      chip={
        issues.length > 0 ? (
          <Badge variant="outline" className="text-xs">
            {issues.length} issue{issues.length !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-xs">No issues</Badge>
        )
      }
    >
      {issues.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-red-600 font-medium">{bySeverity(open, "critical")} critical open</span>
            <span className="text-orange-600 font-medium">{bySeverity(open, "major")} major open</span>
            <span className="text-muted-foreground">{bySeverity(open, "minor")} minor open</span>
            <span className="text-muted-foreground">{resolved.length} resolved</span>
          </div>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 rounded-md border border-border p-2">
                <Badge
                  variant={issue.severity === "critical" ? "destructive" : "outline"}
                  className="shrink-0 text-[10px]"
                >
                  {issue.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{issue.type}</p>
                  <p className="text-xs text-muted-foreground">{issue.location}</p>
                  {issue.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">{issue.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No issues logged.</p>
      )}
    </CollapsibleCard>
  )
}
