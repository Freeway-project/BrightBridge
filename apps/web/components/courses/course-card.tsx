import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { type CourseStatus } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import type { ReviewProgress } from "@/lib/courses/service"
import { cn } from "@/lib/utils"

interface CourseCardProps {
  course: {
    id: string
    sourceCourseId: string | null
    title: string
    term: string | null
    department: string | null
    status: CourseStatus
    updatedAt: string
    reviewProgress?: ReviewProgress
  }
}

export function CourseCard({ course }: CourseCardProps) {
  const { action, owner, tone } = deriveNextAction(course.status)

  return (
    <Card
      className={cn(
        "group/card relative overflow-hidden border border-border/60 bg-card transition-colors hover:bg-card/95",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
        tone === "neutral" && "before:bg-slate-400",
        tone === "info" && "before:bg-blue-500",
        tone === "warning" && "before:bg-amber-500",
        tone === "success" && "before:bg-emerald-500"
      )}
    >
      <CardHeader className="border-b border-border/35 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                {course.sourceCourseId || "NO-CODE"}
              </h3>
              <span className="truncate text-sm font-semibold text-foreground">{course.title}</span>
              <StatusBadge status={course.status} />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground/90">
              <p className="rounded border border-border/60 bg-muted/35 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-foreground/90">
                {course.term || "No Term"}
              </p>
              <p className="font-medium text-foreground/85">{course.department || "No Department"}</p>
              <div className="flex items-center gap-1 font-medium text-foreground/80">
                <Clock className="size-3" />
                Updated {new Date(course.updatedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <p className="font-medium text-foreground">
                Next action: <span className="font-semibold">{action}</span>
              </p>
              <span className="text-muted-foreground/90">Owner: {owner}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="xs"
            asChild
            className="shrink-0 border-border/70 bg-background/80 text-[10px] font-semibold uppercase tracking-wide text-foreground hover:bg-primary hover:text-primary-foreground"
          >
            <Link href={`/courses/${course.id}/metadata`}>
              Open Review
              <ArrowRight className="ml-1.5 size-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-y divide-border/35 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {deriveProgressItems(course.reviewProgress).map((item) => (
            <ProgressItem key={item.label} label={item.label} value={item.value} status={item.status} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

type ProgressStatus = "not_started" | "in_progress" | "submitted"
type ProgressItemData = { label: string; value: string; status: ProgressStatus }

function sectionState(section: ReviewProgress["courseMetadata"] | undefined): ProgressStatus {
  if (!section?.exists) return "not_started"
  if (section.status === "submitted") return "submitted"
  return "in_progress"
}

function deriveProgressItems(progress: ReviewProgress | undefined): ProgressItemData[] {
  const metadataStatus = sectionState(progress?.courseMetadata)
  const matrixStatus = sectionState(progress?.reviewMatrix)
  const syllabusStatus = sectionState(progress?.syllabusReview)

  return [
    { label: "Metadata", value: formatProgressState(metadataStatus), status: metadataStatus },
    { label: "Review Matrix", value: formatProgressState(matrixStatus), status: matrixStatus },
    { label: "Syllabus", value: formatProgressState(syllabusStatus), status: syllabusStatus },
  ]
}

function formatProgressState(state: ProgressStatus): string {
  if (state === "submitted") return "Submitted"
  if (state === "in_progress") return "In Progress"
  return "Not Started"
}

function ProgressItem({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: ProgressStatus
}) {
  const valueClasses = {
    not_started: "border-border/60 bg-muted/35 text-foreground/85",
    in_progress: "border-blue-400/40 bg-blue-500/15 text-blue-200",
    submitted: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-3 transition-colors group-hover/card:bg-muted/10">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("w-fit rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", valueClasses[status])}>
        {value}
      </span>
    </div>
  )
}

function deriveNextAction(status: CourseStatus): {
  action: string
  owner: "TA" | "Admin" | "Admin/Viewer" | "Instructor" | "None"
  tone: "neutral" | "info" | "warning" | "success"
} {
  switch (status) {
    case "course_created":
      return { action: "Assign reviewer", owner: "Admin", tone: "neutral" }
    case "assigned_to_ta":
      return { action: "Start TA review", owner: "TA", tone: "neutral" }
    case "ta_review_in_progress":
      return { action: "Complete and submit review", owner: "TA", tone: "info" }
    case "submitted_to_admin":
      return { action: "Approve or request changes", owner: "Admin", tone: "info" }
    case "admin_changes_requested":
      return { action: "Address requested changes", owner: "TA", tone: "warning" }
    case "ready_for_instructor":
      return { action: "Send to instructor", owner: "Admin/Viewer", tone: "info" }
    case "sent_to_instructor":
      return { action: "Await instructor decision", owner: "Instructor", tone: "info" }
    case "instructor_questions":
      return { action: "Respond and resend", owner: "Admin/Viewer", tone: "warning" }
    case "instructor_approved":
      return { action: "Finalize approval", owner: "Admin", tone: "info" }
    case "final_approved":
      return { action: "Completed", owner: "None", tone: "success" }
    default:
      return { action: "Review status", owner: "Admin", tone: "neutral" }
  }
}
