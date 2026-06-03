"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowRight, AlertTriangle, CheckCircle2, MessageSquare, Clock, History } from "lucide-react"
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow"
import type { CourseTimelineItem } from "@/lib/courses/timeline"
import { DOT_COLORS } from "@/components/courses/status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Props {
  items: CourseTimelineItem[]
}

const SEVERITY_STYLES: Record<string, string> = {
  minor: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  major: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
}

function statusLabel(status: string | null): string {
  if (!status) return "—"
  return getCourseStatusLabel(status as CourseStatus)
}

function formatRole(role: string): string {
  return role.replace(/_/g, " ")
}

export function CourseTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
        <History className="size-10 mb-3 text-primary/40" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No activity yet</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full rounded-2xl border border-border bg-background/50 p-6">
      <ol className="relative space-y-6">
        {/* Vertical connector line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />

        {items.map((item) => (
          <li key={item.id} className="relative flex gap-4">
            <TimelineDot item={item} />
            <div className="flex-1 min-w-0 pb-1">
              <TimelineBody item={item} />
            </div>
          </li>
        ))}
      </ol>
    </ScrollArea>
  )
}

function TimelineDot({ item }: { item: CourseTimelineItem }) {
  if (item.kind === "status") {
    return (
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
        <span className={cn("size-3 rounded-full", DOT_COLORS[item.toStatus as CourseStatus] ?? "bg-slate-400")} />
      </span>
    )
  }

  if (item.kind === "issue_created") {
    return (
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-orange-500/30">
        <AlertTriangle className="size-4 text-orange-500" />
      </span>
    )
  }

  if (item.kind === "issue_resolved") {
    return (
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-green-500/30">
        <CheckCircle2 className="size-4 text-green-600" />
      </span>
    )
  }

  return (
    <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
      <MessageSquare className="size-4 text-muted-foreground" />
    </span>
  )
}

function TimelineBody({ item }: { item: CourseTimelineItem }) {
  const when = (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
      <Clock className="size-3" />
      {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
    </span>
  )

  if (item.kind === "status") {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">{statusLabel(item.fromStatus)}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span className="text-foreground font-semibold">{statusLabel(item.toStatus)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs text-muted-foreground">
            {item.actorName ?? "System"}
            <span className="capitalize text-muted-foreground/60"> · {formatRole(item.actorRole)}</span>
          </span>
          {when}
        </div>
        {item.note && (
          <p className="mt-1 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-foreground/80">{item.note}</p>
        )}
      </div>
    )
  }

  if (item.kind === "comment") {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-foreground">{item.authorName ?? "Unknown"}</span>
          {item.visibility === "internal" && (
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Internal
            </span>
          )}
          {when}
        </div>
        <p className="rounded-lg bg-muted/40 px-3 py-1.5 text-sm text-foreground/90">{item.body}</p>
      </div>
    )
  }

  // issue_created | issue_resolved
  {
    const verb = item.kind === "issue_created" ? "Raised" : "Resolved"
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">
            {verb} {item.issueType.replace(/_/g, " ")}: {item.title}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.minor,
            )}
          >
            {item.severity}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {item.actorName && <span className="text-xs text-muted-foreground">{item.actorName}</span>}
          {when}
        </div>
      </div>
    )
  }
}
