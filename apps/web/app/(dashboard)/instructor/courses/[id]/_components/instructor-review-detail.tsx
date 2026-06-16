import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flag,
  MinusCircle,
  ExternalLink,
  type LucideIcon,
} from "lucide-react"
import type { AdminCourseRow } from "@/lib/admin/queries"
import type { ReviewResponse } from "@/lib/services/review"
import type {
  MetadataResponseData,
  ReviewMatrixResponseData,
  ReviewMatrixStatus,
  SyllabusGradebookResponseData,
  SyllabusRowStatus,
  IssueLogResponseData,
  IssueSeverity,
  IssueStatus,
} from "@/lib/workspace/types"
import { ITEM_LABELS, SYLLABUS_ITEM_LABELS, GRADEBOOK_ITEM_LABELS } from "@/lib/workspace/constants"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"

interface Props {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

type ResponseStatus = "draft" | "submitted" | null

type StatusStyle = { label: string; icon: LucideIcon; className: string }

// Status shown as icon + text (never colour alone) for accessibility.
const STATUS_STYLES: Record<string, StatusStyle> = {
  pass: { label: "Looks good", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  fix_needed: { label: "Needs a fix", icon: AlertTriangle, className: "text-orange-600 dark:text-orange-400" },
  missing: { label: "Missing", icon: XCircle, className: "text-red-600 dark:text-red-400" },
  escalate: { label: "Escalated", icon: Flag, className: "text-red-600 dark:text-red-400" },
  pending: { label: "Pending", icon: MinusCircle, className: "text-muted-foreground" },
  na: { label: "Not applicable", icon: MinusCircle, className: "text-muted-foreground" },
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.na
  const Icon = style.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", style.className)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {style.label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function ResponseStatusChip({ status }: { status: ResponseStatus }) {
  if (status === "submitted") {
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Submitted</span>
  }
  if (status === "draft") {
    return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Draft saved</span>
  }
  return <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Not started</span>
}

function ProgressTile({
  label,
  status,
}: {
  label: string
  status: ResponseStatus
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <ResponseStatusChip status={status} />
      </div>
    </div>
  )
}

function EmptySectionState({
  title,
  status,
  message,
}: {
  title: string
  status: ResponseStatus
  message: string
}) {
  return (
    <Section title={title}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/10 p-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <ResponseStatusChip status={status} />
      </div>
    </Section>
  )
}

function ItemRow({
  label,
  status,
  notes,
  link,
}: {
  label: string
  status: string
  notes?: string
  link?: string
}) {
  return (
    <li className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-medium">{label}</p>
        <StatusPill status={status} />
      </div>
      {notes?.trim() ? <p className="text-sm leading-relaxed text-muted-foreground">{notes}</p> : null}
      {link?.trim() ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
        >
          <ExternalLink className="size-4" aria-hidden /> Open in Brightspace
        </a>
      ) : null}
    </li>
  )
}

const SEVERITY_STYLES: Record<IssueSeverity, { label: string; className: string }> = {
  minor:    { label: "Minor",    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  major:    { label: "Major",    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  critical: { label: "Critical", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
}

const ISSUE_STATUS_STYLES: Record<IssueStatus, { label: string; className: string }> = {
  open:      { label: "Open",      className: "text-orange-600 dark:text-orange-400" },
  fixed:     { label: "Fixed",     className: "text-emerald-600 dark:text-emerald-400" },
  escalated: { label: "Escalated", className: "text-red-600 dark:text-red-400" },
  resolved:  { label: "Resolved",  className: "text-emerald-600 dark:text-emerald-400" },
}

function IssueRow({ issue }: { issue: IssueLogResponseData["issues"][number] }) {
  const sev = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.minor
  const stat = ISSUE_STATUS_STYLES[issue.status] ?? ISSUE_STATUS_STYLES.open
  return (
    <li className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-base font-medium">{issue.type}</p>
          {issue.location && (
            <p className="text-xs text-muted-foreground">Location: <span className="font-mono">{issue.location}</span></p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", sev.className)}>{sev.label}</span>
          <span className={cn("text-sm font-semibold", stat.className)}>{stat.label}</span>
        </div>
      </div>
      {issue.description?.trim() && (
        <p className="text-sm leading-relaxed text-muted-foreground">{issue.description}</p>
      )}
      {issue.direct_link?.trim() && (
        <a
          href={issue.direct_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
        >
          <ExternalLink className="size-4" aria-hidden /> Open in Brightspace
        </a>
      )}
    </li>
  )
}

export function InstructorReviewDetail({ course, responses, sectionKeyById }: Props) {
  const byKey = new Map<string, ReviewResponse>()
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey.set(key, r)
  }

  const metadataResponse = byKey.get("course_metadata")
  const matrixResponse = byKey.get("review_matrix")
  const syllabusResponse = byKey.get("syllabus_review") ?? byKey.get("gradebook_review")
  const issueLogResponse = byKey.get("general_notes")

  const taName = course.ta?.name ?? course.ta?.email ?? null
  const metadata = metadataResponse?.response_data as MetadataResponseData | undefined
  const matrix = matrixResponse?.response_data as ReviewMatrixResponseData | undefined
  const syllabus = syllabusResponse?.response_data as SyllabusGradebookResponseData | undefined
  const issueLog = issueLogResponse?.response_data as IssueLogResponseData | undefined
  const issues = issueLog?.issues?.filter((i) => i.description?.trim() || i.type?.trim()) ?? []

  const metadataStatus = metadataResponse?.status ?? null
  const matrixStatus = matrixResponse?.status ?? null
  const syllabusStatus = syllabusResponse?.status ?? null
  const issueLogStatus = issueLogResponse?.status ?? null

  const hasAnyStructuredData = Boolean(
    metadata ||
    matrix?.items?.length ||
    syllabus?.syllabus_items?.length ||
    syllabus?.gradebook_items?.length ||
    issues.length > 0
  )

  return (
    <div className="max-w-3xl space-y-[var(--card-spacing,1.5rem)]">
      <Section title="TA review progress">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressTile label="Course details" status={metadataStatus} />
          <ProgressTile label="Course review" status={matrixStatus} />
          <ProgressTile label="Syllabus & gradebook" status={syllabusStatus} />
          <ProgressTile label="Issue log" status={issueLogStatus} />
        </div>
        {!hasAnyStructuredData && (
          <p className="text-sm text-muted-foreground">
            The structured TA forms have not been filled out yet for this course. As the review progresses, updates from each form will appear here.
          </p>
        )}
      </Section>
      {issues.length > 0 && (
        <Section title={`Issues flagged by reviewer (${issues.length})`}>
          <ul className="space-y-3">
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        </Section>
      )}

      {metadata ? (
        <Section title="Course details">
          <div className="flex items-center justify-between gap-3">
            <ResponseStatusChip status={metadataStatus} />
            {metadata.migration_notes?.trim() ? <CopyButton value={metadata.migration_notes} label="TA notes" /> : null}
          </div>
          <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-3 sm:gap-x-6 text-base">
            {metadata.term ? (
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6">
                <dt className="text-muted-foreground">Term</dt>
                <dd className="sm:col-span-2 font-medium">{metadata.term}</dd>
              </div>
            ) : null}
            {metadata.section_numbers?.length ? (
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6">
                <dt className="text-muted-foreground">Sections</dt>
                <dd className="sm:col-span-2 font-medium">{metadata.section_numbers.join(", ")}</dd>
              </div>
            ) : null}
            {metadata.migration_notes?.trim() ? (
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6">
                <dt className="text-muted-foreground">Notes from the TA</dt>
                <dd className="sm:col-span-2 leading-relaxed whitespace-pre-wrap">{metadata.migration_notes}</dd>
              </div>
            ) : null}
            {taName && (
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6">
                <dt className="text-muted-foreground">Reviewed by</dt>
                <dd className="sm:col-span-2 font-medium">{taName}</dd>
              </div>
            )}
          </dl>
        </Section>
      ) : (
        <EmptySectionState
          title="Course details"
          status={metadataStatus}
          message={taName ? `Structured course details are not available yet. Reviewer: ${taName}.` : "Structured course details are not available yet."}
        />
      )}

      {matrix?.items?.length ? (
        <Section title="Course review">
          <div className="flex items-center justify-between gap-3">
            <ResponseStatusChip status={matrixStatus} />
            <span className="text-xs text-muted-foreground">{matrix.items.length} checklist items</span>
          </div>
          <ul className="space-y-3">
            {matrix.items.map((item) => (
              <ItemRow
                key={item.item_id}
                label={ITEM_LABELS[item.item_id] ?? item.item_id}
                status={item.status as ReviewMatrixStatus}
                notes={item.notes}
                link={item.direct_link}
              />
            ))}
          </ul>
        </Section>
      ) : (
        <EmptySectionState
          title="Course review"
          status={matrixStatus}
          message="Checklist results are not available yet."
        />
      )}

      {(syllabus?.syllabus_items?.length || syllabus?.gradebook_items?.length) ? (
        <Section title="Syllabus">
          <div className="flex items-center justify-between gap-3">
            <ResponseStatusChip status={syllabusStatus} />
            <span className="text-xs text-muted-foreground">{(syllabus?.syllabus_items?.length ?? 0) + (syllabus?.gradebook_items?.length ?? 0)} review items</span>
          </div>
          <ul className="space-y-3">
            {syllabus.syllabus_items.map((item) => (
              <ItemRow
                key={item.item_id}
                label={SYLLABUS_ITEM_LABELS[item.item_id] ?? item.item_id}
                status={item.ta_status as SyllabusRowStatus}
                notes={item.notes}
                link={item.direct_link}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {syllabus?.gradebook_items?.length ? (
        <Section title="Gradebook">
          <ul className="space-y-3">
            {syllabus.gradebook_items.map((item) => (
              <ItemRow
                key={item.item_id}
                label={GRADEBOOK_ITEM_LABELS[item.item_id] ?? item.item_id}
                status={item.status as ReviewMatrixStatus}
                notes={item.notes}
                link={item.direct_link}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {!(syllabus?.syllabus_items?.length || syllabus?.gradebook_items?.length) ? (
        <EmptySectionState
          title="Syllabus & gradebook"
          status={syllabusStatus}
          message="Syllabus and gradebook notes are not available yet."
        />
      ) : null}

      {issues.length > 0 ? null : (
        <EmptySectionState
          title="Issue log"
          status={issueLogStatus}
          message="No issue log entries have been shared yet."
        />
      )}
    </div>
  )
}
