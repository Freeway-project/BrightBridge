"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, FileText, ShieldAlert } from "lucide-react"
import type { CourseSummary } from "@/lib/courses/service"
import type { IssueCountMap } from "@/components/courses/course-list-view"
import { getPipelineStage } from "@coursebridge/workflow"
import { cn } from "@/lib/utils"

interface Props {
  courses: CourseSummary[]
  issueCounts: IssueCountMap
}

function DonutRing({ pct, color }: { pct: number; color: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={72} height={72} className="-rotate-90">
      <circle cx={36} cy={36} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-border/30" />
      <motion.circle
        cx={36} cy={36} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  )
}

function MiniBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/30">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </div>
  )
}

function InsightCard({ children, className, index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.08 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5",
        "shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-accent-indigo/40",
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

export function TaDashboardInsights({ courses, issueCounts }: Props) {
  const metrics = useMemo(() => {
    const total = courses.length
    if (total === 0) return null

    const done = courses.filter(c => getPipelineStage(c.status) === "provision").length
    const completionPct = (done / total) * 100

    const metadataPct  = (courses.filter(c => c.reviewProgress?.courseMetadata.exists).length / total) * 100
    const matrixPct    = (courses.filter(c => c.reviewProgress?.reviewMatrix.exists).length / total) * 100
    const syllabusPct  = (courses.filter(c => c.reviewProgress?.syllabusReview.exists).length / total) * 100

    const totalOpen     = Object.values(issueCounts).reduce((s, v) => s + v.open, 0)
    const totalResolved = Object.values(issueCounts).reduce((s, v) => s + v.resolved, 0)
    const totalIssues   = totalOpen + totalResolved
    const resolvedPct   = totalIssues > 0 ? (totalResolved / totalIssues) * 100 : 100

    const attentionNeeded = courses.filter(c => c.status === "admin_changes_requested").length
    const stalled = courses.filter(c =>
      c.status === "ta_review_in_progress" &&
      !c.reviewProgress?.courseMetadata.exists &&
      !c.reviewProgress?.reviewMatrix.exists &&
      !c.reviewProgress?.syllabusReview.exists
    ).length

    return { total, done, completionPct, metadataPct, matrixPct, syllabusPct, totalOpen, totalResolved, resolvedPct, attentionNeeded, stalled }
  }, [courses, issueCounts])

  if (!metrics) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InsightCard index={0}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completion</p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <DonutRing pct={metrics.completionPct} color="#22c55e" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
              {Math.round(metrics.completionPct)}%
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{metrics.done}</p>
            <p className="mt-1 text-xs text-muted-foreground">of {metrics.total} courses done</p>
          </div>
        </div>
        <CheckCircle2 className="absolute right-4 top-4 size-4 text-emerald-500/30" />
      </InsightCard>

      <InsightCard index={1}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Section Coverage</p>
        <div className="space-y-2.5">
          <MiniBar pct={metrics.metadataPct}  color="#3b82f6" label="Metadata" />
          <MiniBar pct={metrics.matrixPct}    color="#8b5cf6" label="Review Matrix" />
          <MiniBar pct={metrics.syllabusPct}  color="#06b6d4" label="Syllabus & Gradebook" />
        </div>
        <FileText className="absolute right-4 top-4 size-4 text-blue-500/30" />
      </InsightCard>

      <InsightCard index={2}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Issues</p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none text-amber-500">{metrics.totalOpen}</p>
            <p className="mt-1 text-xs text-muted-foreground">open</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none text-emerald-500">{metrics.totalResolved}</p>
            <p className="mt-1 text-xs text-muted-foreground">resolved</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-amber-500/20">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.resolvedPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.35 }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {Math.round(metrics.resolvedPct)}% resolved
        </p>
        <AlertTriangle className="absolute right-4 top-4 size-4 text-amber-500/30" />
      </InsightCard>

      <InsightCard index={3} className={metrics.attentionNeeded > 0 ? "border-red-500/30" : ""}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Attention Needed</p>
        <div className="flex items-end gap-6">
          <div>
            <p className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              metrics.attentionNeeded > 0 ? "text-red-500" : "text-emerald-500"
            )}>
              {metrics.attentionNeeded}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">fix requested</p>
          </div>
          {metrics.stalled > 0 && (
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none text-amber-500">{metrics.stalled}</p>
              <p className="mt-1 text-xs text-muted-foreground">not started</p>
            </div>
          )}
        </div>
        {metrics.attentionNeeded === 0 && metrics.stalled === 0 && (
          <p className="mt-2 text-xs text-emerald-500">All clear</p>
        )}
        <ShieldAlert className={cn(
          "absolute right-4 top-4 size-4",
          metrics.attentionNeeded > 0 ? "text-red-500/40" : "text-emerald-500/30"
        )} />
      </InsightCard>

    </div>
  )
}
