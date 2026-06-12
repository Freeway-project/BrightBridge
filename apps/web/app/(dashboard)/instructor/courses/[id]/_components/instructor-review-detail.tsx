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
import { cn } from "@/lib/utils"

interface Props {
  course: AdminCourseRow
  responses: ReviewResponse[]
  sectionKeyById: Record<string, string>
}

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

export function InstructorReviewDetail({ responses, sectionKeyById }: Props) {
  const byKey = new Map<string, ReviewResponse>()
  for (const r of responses) {
    const key = sectionKeyById[r.section_id]
    if (key) byKey.set(key, r)
  }

  const metadata = byKey.get("course_metadata")?.response_data as MetadataResponseData | undefined
  const matrix = byKey.get("review_matrix")?.response_data as ReviewMatrixResponseData | undefined
  const syllabus = (byKey.get("syllabus_review")?.response_data ??
    byKey.get("gradebook_review")?.response_data) as SyllabusGradebookResponseData | undefined
  const issueLog = byKey.get("general_notes")?.response_data as IssueLogResponseData | undefined
  const issues = issueLog?.issues?.filter((i) => i.description?.trim() || i.type?.trim()) ?? []

  const hasAny = metadata || matrix || syllabus || issues.length > 0

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        The TA review for this course isn&apos;t available yet.
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-[var(--card-spacing,1.5rem)]">
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
          </dl>
        </Section>
      ) : null}

      {matrix?.items?.length ? (
        <Section title="Course review">
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
      ) : null}

      {syllabus?.syllabus_items?.length ? (
        <Section title="Syllabus">
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
    </div>
  )
}
