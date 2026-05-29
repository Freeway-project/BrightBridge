"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { type CourseStatus } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Clock, AlertCircle, CheckCircle2, ChevronRight, FileDown, FileSpreadsheet } from "lucide-react"
import type { ReviewProgress } from "@/lib/courses/service"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

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
  issueCounts?: { open: number; resolved: number }
  index?: number
  /** Excel/PDF export routes are admin/super_admin only — gate the buttons to match. */
  canExport?: boolean
}

export function CourseCard({ course, issueCounts, index = 0, canExport = false }: CourseCardProps) {
  const { action, owner, tone } = deriveNextAction(course.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card
        className={cn(
          "group/card relative overflow-hidden border border-border/60 bg-card transition-all duration-300",
          "hover:border-primary/50 hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:transition-all before:duration-300",
          "hover:before:w-[5px]",
          tone === "neutral" && "before:bg-slate-400 hover:before:bg-slate-300",
          tone === "info" && "before:bg-blue-500 hover:before:bg-blue-400",
          tone === "warning" && "before:bg-amber-500 hover:before:bg-amber-400",
          tone === "success" && "before:bg-emerald-500 hover:before:bg-emerald-400"
        )}
      >
        <CardHeader className="border-b border-border/35 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/80">
                    {course.sourceCourseId || "NO-CODE"}
                  </h3>
                  <div className="h-4 w-px bg-border/40" />
                </div>
                <span className="truncate text-base font-bold text-foreground transition-colors group-hover/card:text-primary">
                  {course.title}
                </span>
                <StatusBadge status={course.status} className="ml-auto sm:ml-0" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground/90">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 font-bold uppercase tracking-wider text-foreground/90 shadow-sm">
                    {course.term || "No Term"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-muted-foreground/60">Dept:</span>
                  <span className="text-foreground/90">{course.department || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="size-3.5 text-muted-foreground/60" />
                  <span className="text-foreground/85">
                    Updated {new Date(course.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                  {issueCounts && issueCounts.open > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive animate-pulse-subtle">
                      <AlertCircle className="size-3" />
                      {issueCounts.open} OPEN
                    </div>
                  )}
                  {issueCounts && issueCounts.resolved > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                      <CheckCircle2 className="size-3" />
                      {issueCounts.resolved} RESOLVED
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-xs border border-border/40">
                <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ChevronRight className="size-3" />
                </div>
                <p className="font-medium text-foreground/90">
                  <span className="text-muted-foreground">Next:</span> {action}
                </p>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Owner</span>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    owner === "TA" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {owner}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canExport && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`/api/courses/${course.id}/xlsx`}>
                      <FileSpreadsheet className="mr-2 size-4" />
                      Excel
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`/print/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
                      <FileDown className="mr-2 size-4" />
                      PDF
                    </a>
                  </Button>
                </>
              )}
              <Button
                variant={owner === "TA" ? "default" : "outline"}
                size="sm"
                asChild
                className="!text-black"
              >
                <Link href={`/courses/${course.id}/metadata`}>
                  {owner === "TA" ? "Continue Review" : "View Progress"}
                  <ArrowRight className={cn("ml-2 size-4 transition-transform group-hover/card:translate-x-1")} />
                </Link>
              </Button>
            </div>
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
    </motion.div>
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
    { label: "Syllabus & Gradebook", value: formatProgressState(syllabusStatus), status: syllabusStatus },
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
  const statusConfig = {
    not_started: {
      dot: "bg-muted-foreground/30",
      bg: "bg-muted/20",
      text: "text-muted-foreground",
      border: "border-border/40"
    },
    in_progress: {
      dot: "bg-blue-500 animate-pulse",
      bg: "bg-blue-500/5",
      text: "text-blue-400",
      border: "border-blue-500/20"
    },
    submitted: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/5",
      text: "text-emerald-400",
      border: "border-emerald-500/20"
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex flex-col gap-2.5 px-5 py-4 transition-all duration-300 group-hover/card:bg-primary/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</span>
        <div className={cn("size-1.5 rounded-full shadow-[0_0_8px_currentColor]", config.dot)} />
      </div>
      <div className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 transition-all duration-300",
        config.bg,
        config.border
      )}>
        <span className={cn("text-[11px] font-bold uppercase tracking-tight", config.text)}>
          {value}
        </span>
      </div>
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
    case "waiting_on_admin":
      return { action: "Build staging shell", owner: "Admin", tone: "info" }
    case "staging_in_progress":
      return { action: "Finalize course", owner: "TA", tone: "info" }
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
