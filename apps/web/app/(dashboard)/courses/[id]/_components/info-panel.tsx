"use client"
import { CheckCircle2, Circle, Clock3, AlertTriangle, ChevronRight, ChevronLeft, Layout } from "lucide-react"
import { useState } from "react"
import type { CourseStatus } from "@coursebridge/workflow"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"
import { CourseConversation } from "./course-conversation"
import { Button } from "@/components/ui/button"

type SectionProgress = {
  key: string
  label: string
  complete: boolean
}

type InfoPanelProps = {
  courseId: string
  courseStatus: CourseStatus
  reviewerName: string
  reviewerId: string
  instructorName: string | null
  progress: SectionProgress[]
  lastSavedAt: string | null
  escalations: EscalationWithMessages[]
  comments: any[]
}

export function InfoPanel({
  courseId,
  courseStatus,
  reviewerName,
  reviewerId,
  instructorName,
  progress,
  lastSavedAt,
  escalations,
  comments,
}: InfoPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (isCollapsed) {
    return (
      <aside className="hidden w-12 shrink-0 border-l border-border bg-sidebar/5 xl:flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full hover:bg-muted"
          onClick={() => setIsCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="h-px w-6 bg-border/50" />
        <div className="flex flex-col gap-6 py-2">
          <Layout className="size-5 text-muted-foreground/40" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden w-[420px] shrink-0 border-l border-border bg-sidebar/5 xl:block transition-all duration-300 relative overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toggle Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full hover:bg-muted"
            onClick={() => setIsCollapsed(true)}
            title="Collapse sidebar"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border">
          <div className="flex flex-col gap-8 pb-10">
            <section className="space-y-3 pr-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Course Status
              </p>
              <StatusBadge status={courseStatus} className="w-full justify-center py-1.5" />
            </section>

            <section className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Participants
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {reviewerName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{reviewerName}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Assigned TA</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <p className="text-[11px] text-muted-foreground">Admin: <span className="text-foreground/70 italic">Pending assignment</span></p>
                  {instructorName ? (
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                        {instructorName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{instructorName}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Instructor</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Instructor: <span className="text-foreground/70 italic">Pending selection</span></p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Checklist Progress
                </p>
                <p className="text-[10px] font-bold text-primary">
                  {Math.round((progress.filter(p => p.complete).length / progress.length) * 100)}%
                </p>
              </div>
              <div className="space-y-2.5">
                {progress.map((item) => (
                  <div className="flex items-center gap-3 group" key={item.key}>
                    <div className={cn(
                      "size-1.5 rounded-full transition-colors",
                      item.complete ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        item.complete ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/70",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.complete && <CheckCircle2 className="size-3 text-green-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </section>

            <div className="pt-6 border-t border-border/50 flex flex-col gap-6">
              <section className="space-y-2 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Last Activity
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock3 className="size-3" />
                  <span>
                    {lastSavedAt
                      ? new Date(lastSavedAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "No drafts saved yet"}
                  </span>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 w-fit shrink-0">
                  <AlertTriangle className="size-3.5 text-red-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                    Escalation
                  </p>
                </div>
                <div className="min-h-[400px]">
                  <CourseConversation
                    courseId={courseId}
                    currentUserId={reviewerId}
                    escalations={escalations}
                    comments={comments}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
