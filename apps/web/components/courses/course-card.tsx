import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { type CourseStatus } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronRight, ArrowRight } from "lucide-react"
import type { ReviewProgress } from "@/lib/courses/service"
import { cn } from "@/lib/utils"

interface CourseCardProps {
  course: {
    id: string
    sourceCourseId: string | null
    title: string
    term: string | null
    status: CourseStatus
    updatedAt: string
    reviewProgress?: ReviewProgress
  }
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="overflow-hidden border-border bg-card hover:border-primary/20 transition-colors">
      <CardHeader className="p-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">
                {course.sourceCourseId || "NO-CODE"}
              </h3>
              <span className="text-base text-muted-foreground">{course.title}</span>
              <StatusBadge status={course.status} />
              <NextStepBadge status={course.status} progress={course.reviewProgress} />
            </div>
            <p className="text-xs text-muted-foreground">
              {course.term || "No Term"} • Last updated {new Date(course.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={`/courses/${course.id}/metadata`}>
              View Review
              <ChevronRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/50">
          {deriveStatusItems(course.status, course.reviewProgress).map((item) => (
            <StatusItem key={item.label} label={item.label} value={item.value} status={item.status} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

type StatusItemData = { label: string; value: string; status: 'success' | 'warning' | 'error' | 'muted' | 'info' }

function deriveStatusItems(courseStatus: CourseStatus, progress: ReviewProgress | undefined): StatusItemData[] {
  const meta = progress?.courseMetadata
  const courseInfo: StatusItemData = meta?.exists
    ? { label: "Course Info", value: "Complete", status: "success" }
    : { label: "Course Info", value: "Not Started", status: "muted" }

  const hasMigrationNotes =
    meta?.exists &&
    typeof meta.responseData?.["migration_notes"] === "string" &&
    (meta.responseData["migration_notes"] as string).trim().length > 0
  const migrationNotes: StatusItemData = hasMigrationNotes
    ? { label: "Migration Notes", value: "Available", status: "success" }
    : { label: "Migration Notes", value: "Not Available", status: "muted" }

  const matrix = progress?.reviewMatrix
  const checklist: StatusItemData = !matrix?.exists
    ? { label: "Checklist", value: "Not Started", status: "muted" }
    : matrix.status === "submitted"
    ? { label: "Checklist", value: "Submitted", status: "success" }
    : { label: "Checklist", value: "In Progress", status: "warning" }

  const syllabus = progress?.syllabusReview
  const gradebook: StatusItemData = !syllabus?.exists
    ? { label: "Gradebook", value: "Not Started", status: "muted" }
    : syllabus.status === "submitted"
    ? { label: "Gradebook", value: "Submitted", status: "success" }
    : { label: "Gradebook", value: "In Progress", status: "warning" }

  const approvedStatuses: CourseStatus[] = ["instructor_approved", "final_approved"]
  const finalApproval: StatusItemData = approvedStatuses.includes(courseStatus)
    ? { label: "Final Approval", value: "Approved", status: "success" }
    : courseStatus === "submitted_to_admin"
    ? { label: "Final Approval", value: "Under Review", status: "info" }
    : { label: "Final Approval", value: "Waiting", status: "muted" }

  return [courseInfo, migrationNotes, checklist, gradebook, finalApproval]
}

function StatusItem({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'muted' | 'info'
}) {
  const statusClasses = {
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    error: "text-red-500 bg-red-500/10 border-red-500/20",
    muted: "text-muted-foreground bg-muted/50 border-transparent",
    info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  }

  return (
    <div className="p-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn(
        "text-xs font-bold px-2 py-0.5 rounded-full w-fit border",
        statusClasses[status]
      )}>
        {value}
      </span>
    </div>
  )
}

type NextStep = { label: string; style: string }

function deriveNextStep(status: CourseStatus, progress: ReviewProgress | undefined): NextStep {
  if (status === "admin_changes_requested")
    return { label: "Fix Requested", style: "bg-red-500/15 text-red-600 border-red-400/30" }

  const pastSubmit: CourseStatus[] = ["submitted_to_admin", "ready_for_instructor", "sent_to_instructor", "instructor_questions", "instructor_approved", "final_approved"]
  if ((pastSubmit as string[]).includes(status))
    return { label: "Waiting on Admin", style: "bg-muted text-muted-foreground border-border" }

  if (!progress?.courseMetadata?.exists)
    return { label: "Fill Metadata", style: "bg-blue-500/15 text-blue-600 border-blue-400/30" }
  if (!progress?.reviewMatrix?.exists)
    return { label: "Fill Checklist", style: "bg-blue-500/15 text-blue-600 border-blue-400/30" }
  if (!progress?.syllabusReview?.exists)
    return { label: "Fill Syllabus", style: "bg-blue-500/15 text-blue-600 border-blue-400/30" }

  return { label: "Ready to Submit", style: "bg-green-500/15 text-green-700 border-green-500/20" }
}

function NextStepBadge({ status, progress }: { status: CourseStatus; progress: ReviewProgress | undefined }) {
  const { label, style } = deriveNextStep(status, progress)
  return (
    <div className={cn("flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", style)}>
      <ArrowRight className="size-3 shrink-0" />
      {label}
    </div>
  )
}
