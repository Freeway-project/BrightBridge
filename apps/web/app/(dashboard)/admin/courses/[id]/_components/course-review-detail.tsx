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
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle, CheckCircle2, MinusCircle, HelpCircle, Clock, Circle, FileText, ListChecks, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ITEM_LABELS, SYLLABUS_ITEM_LABELS, GRADEBOOK_ITEM_LABELS } from "@/lib/workspace/constants"

type Props = {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

export function CourseReviewDetail({ course, responses, sectionKeyById }: Props) {
  const byKey: Record<string, ReviewResponse> = {}
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey[key] = r
  }

  const meta = byKey["course_metadata"]?.response_data as MetadataResponseData | undefined
  const matrix = byKey["review_matrix"]?.response_data as ReviewMatrixResponseData | undefined
  const syllabus = byKey["syllabus_review"]?.response_data as SyllabusGradebookResponseData | undefined
  const issueLog = byKey["general_notes"]?.response_data as IssueLogResponseData | undefined

  const metaStatus = byKey["course_metadata"]?.status ?? null
  const matrixStatus = byKey["review_matrix"]?.status ?? null
  const syllabusStatus = byKey["syllabus_review"]?.status ?? null
  const issueLogStatus = byKey["general_notes"]?.status ?? null

  const taName = course.ta?.name ?? course.ta?.email ?? null

  return (
    <div className="space-y-[var(--card-spacing,1rem)]">
      <ReviewProgressSummary metaStatus={metaStatus} matrixStatus={matrixStatus} syllabusStatus={syllabusStatus} issueLogStatus={issueLogStatus} />
      <MetadataCard data={meta} responseStatus={metaStatus} taName={taName} />
      <ReviewMatrixCard data={matrix} responseStatus={matrixStatus} />
      <SyllabusCard data={syllabus} responseStatus={syllabusStatus} />
      <IssueLogCard data={issueLog} responseStatus={issueLogStatus} />
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function ReviewProgressSummary({
  metaStatus, matrixStatus, syllabusStatus, issueLogStatus,
}: {
  metaStatus: "draft" | "submitted" | null
  matrixStatus: "draft" | "submitted" | null
  syllabusStatus: "draft" | "submitted" | null
  issueLogStatus: "draft" | "submitted" | null
}) {
  const tiles = [
    { label: "Metadata",     status: metaStatus,     icon: FileText },
    { label: "Review Matrix", status: matrixStatus,  icon: ListChecks },
    { label: "Syllabus & GB", status: syllabusStatus, icon: BookOpen },
    { label: "Issue Log",    status: issueLogStatus,  icon: AlertTriangle },
  ]

  const submittedCount = [metaStatus, matrixStatus, syllabusStatus, issueLogStatus].filter((s) => s === "submitted").length

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">TA Review Progress</CardTitle>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            submittedCount === 4
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : submittedCount > 0
                ? "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                : "bg-muted text-muted-foreground"
          )}>
            {submittedCount}/4 sections submitted
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(({ label, status, icon: Icon }) => {
            const isSubmitted = status === "submitted"
            const isDraft = status === "draft"
            return (
              <div
                key={label}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                  isSubmitted
                    ? "border-green-500/30 bg-green-500/10"
                    : isDraft
                      ? "border-orange-400/30 bg-orange-500/8"
                      : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className={cn("size-4", isSubmitted ? "text-green-600" : isDraft ? "text-orange-500" : "text-muted-foreground/50")} />
                  {isSubmitted ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : isDraft ? (
                    <Clock className="size-4 text-orange-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/30" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-widest mt-1",
                    isSubmitted ? "text-success" : isDraft ? "text-warning" : "text-muted-foreground/40",
                  )}>
                    {isSubmitted ? "Submitted" : isDraft ? "Draft saved" : "Not started"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionStatusChip({ responseStatus }: { responseStatus: "draft" | "submitted" | null }) {
  if (responseStatus === "submitted")
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400 border border-green-500/20">
        <CheckCircle2 className="size-3.5" />
        Submitted
      </div>
    )
  if (responseStatus === "draft")
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 border border-orange-400/30">
        <Clock className="size-3.5" />
        Draft saved
      </div>
    )
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border border-border">
      <Circle className="size-3.5" />
      Not started
    </div>
  )
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
  taName,
}: {
  data: MetadataResponseData | undefined
  responseStatus: "draft" | "submitted" | null
  taName: string | null
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
          <div className="sm:col-span-2">
            <Field label="Migration Notes" value={data.migration_notes} />
          </div>
          {taName && (
            <div className="sm:col-span-2">
              <Field label="Reviewer (TA)" value={taName} />
            </div>
          )}
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

const WORKSPACE_ISSUE_STATUS: Record<string, { label: string; className: string }> = {
  open:      { label: "Open",      className: "text-orange-600 dark:text-orange-400" },
  fixed:     { label: "Fixed",     className: "text-emerald-600 dark:text-emerald-400" },
  escalated: { label: "Escalated", className: "text-purple-600 dark:text-purple-400" },
  resolved:  { label: "Resolved",  className: "text-emerald-600 dark:text-emerald-400" },
}

const WORKSPACE_SEVERITY: Record<string, { label: string; className: string }> = {
  minor:    { label: "Minor",    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  major:    { label: "Major",    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  critical: { label: "Critical", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
}

function IssueLogCard({
  data,
  responseStatus,
}: {
  data: IssueLogResponseData | undefined
  responseStatus: "draft" | "submitted" | null
}) {
  const issues = data?.issues?.filter((i) => i.description?.trim() || i.type?.trim()) ?? []

  return (
    <CollapsibleCard title="Issue Log" chip={<SectionStatusChip responseStatus={responseStatus} />}>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues logged in the TA review.</p>
      ) : (
        <div className="grid gap-2">
          {issues.map((issue) => {
            const sev = WORKSPACE_SEVERITY[issue.severity] ?? WORKSPACE_SEVERITY.minor
            const stat = WORKSPACE_ISSUE_STATUS[issue.status] ?? WORKSPACE_ISSUE_STATUS.open
            return (
              <div
                key={issue.id}
                className="flex flex-col gap-1 rounded-md border border-border p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{issue.type}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", sev.className)}>
                        {sev.label}
                      </span>
                      <span className={cn("text-xs font-semibold", stat.className)}>
                        {stat.label}
                      </span>
                    </div>
                    {issue.location && (
                      <p className="text-xs text-muted-foreground">
                        Location: <span className="font-mono">{issue.location}</span>
                      </p>
                    )}
                    {issue.description?.trim() && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {issue.description}
                      </p>
                    )}
                  </div>
                  {issue.direct_link?.trim() && (
                    <a
                      href={issue.direct_link}
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
            )
          })}
        </div>
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

