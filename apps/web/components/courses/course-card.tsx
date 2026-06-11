"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { getPipelineStage, type CourseStatus, type PipelineStage } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileDown, 
  FileSpreadsheet, 
  User, 
  GraduationCap, 
  ArrowRightLeft,
  Copy,
  Check,
  ShieldAlert,
  Shield
} from "lucide-react"
import type { ReviewProgress } from "@/lib/courses/service"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState } from "react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CourseCardProps {
  course: {
    id: string
    sourceCourseId: string | null
    targetCourseId?: string | null
    title: string
    term: string | null
    department: string | null
    status: CourseStatus
    updatedAt: string
    ta?: { name: string | null; email: string } | null
    instructor?: { name: string | null; email: string } | null
    reviewProgress?: ReviewProgress
  }
  issueCounts?: { open: number; resolved: number }
  index?: number
  /** Excel/PDF export routes are admin/super_admin only — gate the buttons to match. */
  canExport?: boolean
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={handleCopy}
            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] uppercase font-bold tracking-wider">
          {copied ? "Copied!" : `Copy ${label}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "migration", label: "Migration" },
  { key: "staging", label: "Staging" },
  { key: "instructor", label: "Instructor" },
  { key: "provision", label: "Provision" },
]

function TimelineStepper({ currentStage }: { currentStage: PipelineStage }) {
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStage)
  
  return (
    <div className="flex items-center w-full px-2 mt-6 mb-4 relative max-w-2xl mx-auto sm:mx-0">
      <div className="absolute left-6 right-6 top-3 -translate-y-1/2 h-[2px] bg-border/50 -z-10" />
      <div 
        className="absolute left-6 top-3 -translate-y-1/2 h-[2px] bg-primary transition-all duration-700 -z-10" 
        style={{ width: `${Math.max(0, (currentIndex / (PIPELINE_STAGES.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 3rem)' }} 
      />
      
      {PIPELINE_STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isUpcoming = i > currentIndex
        
        return (
          <div key={stage.key} className="flex flex-col items-center flex-1 relative group">
            <div className={cn(
              "flex size-6 items-center justify-center rounded-full border-2 transition-all duration-500 bg-card z-10",
              isCompleted && "border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]",
              isCurrent && "border-primary ring-4 ring-primary/20 scale-110",
              isUpcoming && "border-muted-foreground/30 text-muted-foreground/30"
            )}>
              {isCompleted ? (
                <Check className="size-3.5 stroke-[3]" />
              ) : isCurrent ? (
                <div className="size-2 rounded-full bg-primary animate-pulse" />
              ) : (
                <div className="size-1.5 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <div className="mt-2 text-center absolute top-6 w-24">
              <span className={cn(
                "block text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                isCurrent ? "text-primary" : isCompleted ? "text-foreground/70" : "text-muted-foreground/50"
              )}>
                {stage.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CourseCard({ course, issueCounts, index = 0, canExport = false }: CourseCardProps) {
  const { action, owner, tone } = deriveNextAction(course.status)
  const progress = computeProgress(course.reviewProgress)
  const age = daysSince(course.updatedAt)
  const stale = age >= 7 && course.status !== "final_approved"
  const assigneeName = course.ta?.name ?? course.ta?.email ?? null
  const instructorName = course.instructor?.name ?? course.instructor?.email ?? null
  const currentStage = getPipelineStage(course.status)

  const toneConfig = {
    neutral: "border-slate-500/30 bg-slate-500/5 text-slate-500",
    info: "border-blue-500/40 bg-blue-500/10 text-blue-500",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-500",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  }

  const OwnerIcon = owner === "TA" ? User : owner === "Instructor" ? GraduationCap : Shield
  const ownerLabel = owner === "TA" ? assigneeName || "Any TA" : owner === "Instructor" ? instructorName || "Instructor" : owner

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card
        className={cn(
          "group/card relative overflow-hidden border border-border/60 bg-card transition-all duration-300",
          "hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:dark:shadow-[0_0_25px_rgba(129,140,248,0.15)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:transition-all before:duration-300",
          "hover:before:w-[5px]",
          tone === "neutral" && "before:bg-slate-400 hover:before:bg-slate-300",
          tone === "info" && "before:bg-blue-500 hover:before:bg-blue-400",
          tone === "warning" && "before:bg-amber-500 hover:before:bg-amber-400",
          tone === "success" && "before:bg-emerald-500 hover:before:bg-emerald-400"
        )}
      >
        <CardHeader className="border-b border-border/35 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              
              {/* Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/80">
                      {course.sourceCourseId || "NO-CODE"}
                    </h3>
                    {course.sourceCourseId && <CopyButton text={course.sourceCourseId} label="Source ID" />}
                  </div>
                  
                  {course.targetCourseId && (
                    <>
                      <ArrowRightLeft className="size-3 text-muted-foreground/40 hidden sm:block" />
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60" title="Target course code">
                          {course.targetCourseId}
                        </span>
                        <CopyButton text={course.targetCourseId} label="Target ID" />
                      </div>
                    </>
                  )}
                </div>
                <StatusBadge status={course.status} />
              </div>
              
              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-foreground transition-colors group-hover/card:text-primary leading-tight">
                {course.title}
              </h2>

              {/* Tags & Meta Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs text-muted-foreground/90">
                <span className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 font-bold uppercase tracking-wider text-foreground/90 shadow-sm">
                  {course.term || "No Term"}
                </span>
                
                {course.department && (
                  <span className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 font-medium text-foreground/90 shadow-sm">
                    {course.department}
                  </span>
                )}

                <div
                  className={cn(
                    "flex items-center gap-1.5 font-medium px-2 py-1 rounded-md",
                    stale ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-foreground/85",
                  )}
                  title={`In this stage for ${age} day${age === 1 ? "" : "s"} (updated ${new Date(course.updatedAt).toLocaleDateString()})`}
                >
                  <Clock className={cn("size-3.5", stale ? "text-amber-500" : "text-muted-foreground/60")} />
                  <span>{formatAge(age)} in stage</span>
                </div>

                {/* Issues Pills */}
                <div className="flex items-center gap-2">
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

              {/* Timeline Stepper */}
              <div className="py-2">
                <TimelineStepper currentStage={currentStage} />
              </div>

              {/* Next Action Banner */}
              <div className={cn(
                "mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300", 
                toneConfig[tone],
                "shadow-sm"
              )}>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 flex items-center gap-1.5">
                    {tone === 'warning' && <ShieldAlert className="size-3" />}
                    Next Action
                  </div>
                  <div className="font-bold text-sm text-foreground/90">{action}</div>
                </div>
                
                <div className="flex items-center gap-2.5 bg-background/50 border border-border/50 rounded-lg px-3 py-1.5">
                   <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Assigned To:</div>
                   <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
                     <OwnerIcon className="size-3.5 opacity-80" />
                     <span className="max-w-[12rem] truncate">{ownerLabel}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Actions Sidebar */}
            <div className="flex sm:flex-col shrink-0 gap-3 justify-end sm:justify-start w-full sm:w-auto">
              <Button
                size="default"
                asChild
                className={cn(
                  "font-bold transition-all duration-300 border-none w-full sm:w-auto h-10 px-5",
                  owner === "TA"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-md hover:shadow-lg"
                )}
              >
                <Link href={`/courses/${course.id}/metadata`}>
                  {owner === "TA" ? "Continue Review" : "View Progress"}
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover/card:translate-x-1" />
                </Link>
              </Button>
              
              {canExport && (
                <div className="flex gap-2 sm:flex-col w-full sm:w-auto">
                  <Button variant="outline" size="sm" asChild className="flex-1 sm:w-full">
                    <a href={`/api/courses/${course.id}/xlsx`}>
                      <FileSpreadsheet className="mr-2 size-4" /> Excel
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1 sm:w-full">
                    <a href={`/print/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
                      <FileDown className="mr-2 size-4" /> PDF
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 bg-muted/10 border-t border-border/40">
          <div className="px-5 py-2.5 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Review Progress Detail
            </div>
            <div className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              progress.pct === 100 ? "text-emerald-500" : "text-foreground/80"
            )}>
              {progress.pct}% Complete
            </div>
          </div>
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

function ProgressItem({ label, value, status }: { label: string; value: string; status: ProgressStatus }) {
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
    <div className="flex flex-col gap-2.5 px-5 py-3 transition-all duration-300 group-hover/card:bg-primary/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</span>
        <div className={cn("size-1.5 rounded-full shadow-[0_0_8px_currentColor]", config.dot)} />
      </div>
      <div className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 transition-all duration-300 w-fit",
        config.bg,
        config.border
      )}>
        <span className={cn("text-[10px] font-bold uppercase tracking-tight", config.text)}>
          {value}
        </span>
      </div>
    </div>
  )
}

function computeProgress(progress: ReviewProgress | undefined): { pct: number; submitted: number; total: number } {
  const sections = [progress?.courseMetadata, progress?.reviewMatrix, progress?.syllabusReview]
  const total = sections.length
  let score = 0
  let submitted = 0
  for (const s of sections) {
    if (s?.status === "submitted") { score += 1; submitted += 1 }
    else if (s?.exists) { score += 0.5 }
  }
  return { pct: Math.round((score / total) * 100), submitted, total }
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function formatAge(days: number): string {
  if (days <= 0) return "today"
  if (days === 1) return "1d"
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
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
