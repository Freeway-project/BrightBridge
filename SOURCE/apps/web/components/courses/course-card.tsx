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
              <h2 className="text-xl sm:text-2xl font-bold text-foreground transition-all duration-300 group-hover/card:bg-gradient-to-r group-hover/card:from-primary group-hover/card:to-indigo-500 group-hover/card:bg-clip-text group-hover/card:text-transparent leading-tight">
                {course.title}
              </h2>

              {/* Tags & Meta Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 shadow-sm">
                  {course.term || "No Term"}
                </span>
                
                {course.department && (
                  <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-700 dark:text-violet-400 shadow-sm">
                    {course.department}
                  </span>
                )}

                <div
                  className={cn(
                    "flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-md shadow-sm border",
                    stale ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                  )}
                  title={`In this stage for ${age} day${age === 1 ? "" : "s"} (updated ${new Date(course.updatedAt).toLocaleDateString()})`}
                >
                  <Clock className={cn("size-3.5", stale ? "text-amber-500" : "text-sky-600 dark:text-sky-400")} />
                  <span>{formatAge(age)} in stage</span>
                </div>
              </div>

              {/* Progress Detail Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                {deriveProgressItems(course.reviewProgress).map((item) => (
                  <div key={item.label} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors",
                    item.status === "submitted" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-sm" :
                    item.status === "in_progress" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 shadow-sm" :
                    "bg-muted/40 text-muted-foreground/50 border-border/30"
                  )}>
                    {item.status === "submitted" ? <CheckCircle2 className="size-3.5" /> : 
                     item.status === "in_progress" ? <div className="size-2 rounded-full bg-blue-500 animate-pulse" /> : 
                     <div className="size-1.5 rounded-full bg-muted-foreground/40" />}
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Issue Counts */}
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
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
            <div className="flex flex-col shrink-0 gap-3 justify-end sm:justify-start w-full sm:w-auto">
              <Button
                size="default"
                asChild
                className={cn(
                  "font-bold transition-all duration-300 border-none w-full sm:w-auto h-10 px-5",
                  owner === "TA"
                    ? "bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                )}
              >
                <Link href={`/courses/${course.id}/metadata`}>
                  {owner === "TA" ? "Continue Review" : "View Progress"}
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover/card:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
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
