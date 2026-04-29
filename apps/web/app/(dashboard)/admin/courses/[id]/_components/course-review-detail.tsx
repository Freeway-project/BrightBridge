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
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, CheckCircle2, MinusCircle, HelpCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ITEM_LABELS, SYLLABUS_ITEM_LABELS, GRADEBOOK_ITEM_LABELS } from "@/lib/workspace/constants"

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

const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="size-3.5 text-green-600" />,
  fix_needed: <AlertTriangle className="size-3.5 text-orange-600" />,
  missing: <AlertTriangle className="size-3.5 text-red-600" />,
  escalate: <HelpCircle className="size-3.5 text-purple-600" />,
  na: <MinusCircle className="size-3.5 text-muted-foreground" />,
}

function ReviewMatrixCard({
  data,
  responseStatus,
}: {
  data: ReviewMatrixResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const [showAll, setShowAll] = useState(false)
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
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted/20 px-3 py-2">
            {Object.entries(STATUS_LABEL).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                {STATUS_ICON[status]}
                <span className="text-xs font-medium">
                  {counts[status] ?? 0} {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {showAll ? "All checklist items" : "Items needing attention"}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] uppercase font-bold tracking-tight"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(!showAll);
              }}
            >
              {showAll ? "Show flagged only" : "Show all items"}
            </Button>
          </div>

          <div className="grid gap-2">
            {(showAll ? items : flagged).length > 0 ? (
              (showAll ? items : flagged).map((item) => (
                <div 
                  key={item.item_id} 
                  className={cn(
                    "group relative flex flex-col gap-1 rounded-md border border-border p-3 transition-colors hover:bg-muted/30",
                    item.status !== "pass" && item.status !== "na" ? "bg-card shadow-sm" : "bg-muted/10 opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {STATUS_ICON[item.status]}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                            {item.item_id}
                          </Badge>
                          <span className={cn("text-[10px] font-bold uppercase", STATUS_COLOR[item.status])}>
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {ITEM_LABELS[item.item_id] ?? item.item_id}
                        </p>
                        {item.notes && (
                          <div className="mt-2 flex items-start gap-2 rounded-sm bg-orange-500/5 p-2 border-l-2 border-orange-500/30">
                            <p className="text-sm text-muted-foreground italic leading-relaxed">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.direct_link && (
                      <a
                        href={item.direct_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-border"
                        onClick={(e) => e.stopPropagation()}
                        title="Open direct link"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-md bg-muted/5">
                <CheckCircle2 className="mx-auto size-8 text-green-500/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">All items passed!</p>
                <p className="text-xs text-muted-foreground/60">No flags or issues to display in this view.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data saved yet.</p>
      )}
    </CollapsibleCard>
  )
}

const SYLLABUS_STATUS_ICON: Record<string, React.ReactNode> = {
  confirmed: <CheckCircle2 className="size-3.5 text-green-600" />,
  fix_needed: <AlertTriangle className="size-3.5 text-orange-600" />,
  pending: <Clock className="size-3.5 text-muted-foreground" />,
}

const SYLLABUS_STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  fix_needed: "Fix Needed",
  pending: "Pending",
}

function SyllabusCard({
  data,
  responseStatus,
}: {
  data: SyllabusGradebookResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const [showAll, setShowAll] = useState(false)
  const syllabusItems = data?.syllabus_items ?? []
  const gradebookItems = data?.gradebook_items ?? []

  const flaggedSyllabus = syllabusItems.filter((i) => i.ta_status === "fix_needed")
  const flaggedGradebook = gradebookItems.filter((i) => i.status !== "pass" && i.status !== "na")

  const totalFlagged = flaggedSyllabus.length + flaggedGradebook.length

  return (
    <CollapsibleCard title="Syllabus & Gradebook" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {data ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            {data.instructor_email && (
              <Field label="Instructor" value={data.instructor_email} />
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Detailed Review
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] uppercase font-bold tracking-tight"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(!showAll);
                }}
              >
                {showAll ? "Show flagged only" : `Show all (${syllabusItems.length + gradebookItems.length})`}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Syllabus Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Syllabus</h4>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              
              <div className="grid gap-2">
                {(showAll ? syllabusItems : flaggedSyllabus).length > 0 ? (
                  (showAll ? syllabusItems : flaggedSyllabus).map((item) => (
                    <div 
                      key={item.item_id} 
                      className={cn(
                        "flex flex-col gap-1 rounded-md border border-border p-3 transition-colors hover:bg-muted/30",
                        item.ta_status === "fix_needed" ? "bg-card shadow-sm" : "bg-muted/10 opacity-75"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {SYLLABUS_STATUS_ICON[item.ta_status]}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                              {item.item_id}
                            </Badge>
                            <span className={cn("text-[10px] font-bold uppercase", item.ta_status === "confirmed" ? "text-green-600" : item.ta_status === "fix_needed" ? "text-orange-600" : "text-muted-foreground")}>
                              {SYLLABUS_STATUS_LABEL[item.ta_status]}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {SYLLABUS_ITEM_LABELS[item.item_id] ?? item.item_id}
                          </p>
                          {item.notes && (
                            <div className="mt-2 flex items-start gap-2 rounded-sm bg-orange-500/5 p-2 border-l-2 border-orange-500/30">
                              <p className="text-sm text-muted-foreground italic leading-relaxed">
                                &ldquo;{item.notes}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : !showAll ? (
                  <p className="text-xs text-muted-foreground italic py-1 pl-1">No syllabus flags.</p>
                ) : null}
              </div>
            </div>

            {/* Gradebook Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Gradebook</h4>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              <div className="grid gap-2">
                {(showAll ? gradebookItems : flaggedGradebook).length > 0 ? (
                  (showAll ? gradebookItems : flaggedGradebook).map((item) => (
                    <div 
                      key={item.item_id} 
                      className={cn(
                        "flex flex-col gap-1 rounded-md border border-border p-3 transition-colors hover:bg-muted/30",
                        item.status !== "pass" && item.status !== "na" ? "bg-card shadow-sm" : "bg-muted/10 opacity-75"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {STATUS_ICON[item.status]}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                                {item.item_id}
                              </Badge>
                              <span className={cn("text-[10px] font-bold uppercase", STATUS_COLOR[item.status])}>
                                {STATUS_LABEL[item.status]}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-snug">
                              {GRADEBOOK_ITEM_LABELS[item.item_id] ?? item.item_id}
                            </p>
                            {item.notes && (
                              <div className="mt-2 flex items-start gap-2 rounded-sm bg-orange-500/5 p-2 border-l-2 border-orange-500/30">
                                <p className="text-sm text-muted-foreground italic leading-relaxed">
                                  &ldquo;{item.notes}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.direct_link && (
                          <a
                            href={item.direct_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : !showAll ? (
                  <p className="text-xs text-muted-foreground italic py-1 pl-1">No gradebook flags.</p>
                ) : null}
              </div>
            </div>

            {!showAll && totalFlagged === 0 && (
              <div className="text-center py-6 border-2 border-dashed rounded-md bg-muted/5">
                <CheckCircle2 className="mx-auto size-6 text-green-500/50 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Everything looks good!</p>
              </div>
            )}
          </div>
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
