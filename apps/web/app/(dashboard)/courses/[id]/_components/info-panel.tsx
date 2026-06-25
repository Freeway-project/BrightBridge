"use client"
import { CheckCircle2, Clock3, AlertTriangle, ChevronRight, ChevronLeft, Layout } from "lucide-react"
import { useState, useEffect } from "react"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import type { CourseComment } from "@/lib/services/comments"
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
  reviewerId: string
  progress: SectionProgress[]
  lastSavedAt: string | null
  escalations: EscalationWithMessages[]
  comments: CourseComment[]
  sharedComments: CourseComment[]
}

const INFO_PANEL_COLLAPSED_KEY = "coursebridge:course-review-info-panel-collapsed"

export function InfoPanel({
  courseId,
  reviewerId,
  progress,
  lastSavedAt,
  escalations,
  comments,
  sharedComments,
}: InfoPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem(INFO_PANEL_COLLAPSED_KEY)
    if (saved === "1") setIsCollapsed(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(INFO_PANEL_COLLAPSED_KEY, isCollapsed ? "1" : "0")
  }, [isCollapsed])

  useEffect(() => {
    if (lastSavedAt) {
      setFormattedDate(
        new Date(lastSavedAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      )
    }
  }, [lastSavedAt])

  if (isCollapsed) {
    return (
      <aside className="hidden w-10 shrink-0 border-l border-border-icy bg-sidebar/40 lg:flex flex-col items-center py-3 gap-3 transition-all duration-300 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all"
          onClick={() => setIsCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="h-px w-5 bg-border-icy" />
        <Layout className="size-4 text-muted-foreground/30 animate-pulse" />
      </aside>
    )
  }

  return (
    <aside className="hidden w-[320px] shrink-0 border-l border-border-icy bg-sidebar/40 lg:block transition-all duration-300 relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col h-full overflow-hidden bg-sidebar/20">
        {/* Dedicated Glass Header for InfoPanel */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-icy bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Layout className="size-3.5 text-muted-foreground/80" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/80">Workspace Info</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            onClick={() => setIsCollapsed(true)}
            title="Collapse sidebar"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border/20">
          <div className="flex flex-col gap-6 pb-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Review Progress
                </p>
                <div className="flex items-center gap-2">
                   <div className="h-1 w-14 rounded-full bg-primary/10 overflow-hidden">
                      <div
                         className="h-full bg-primary transition-all duration-1000"
                         style={{ width: `${(progress.filter(p => p.complete).length / progress.length) * 100}%` }}
                      />
                   </div>
                   <p className="text-[10px] font-black text-primary">
                     {Math.round((progress.filter(p => p.complete).length / progress.length) * 100)}%
                   </p>
                </div>
              </div>
              <div className="space-y-1.5 px-1">
                {progress.map((item) => (
                  <div className="flex items-center gap-3 group p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-border-icy" key={item.key}>
                    <div className={cn(
                      "size-1.5 rounded-full ring-4 ring-transparent transition-all",
                      item.complete ? "bg-success ring-success/10 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-primary/20"
                    )} />
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-tight transition-colors",
                        item.complete ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/70",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.complete && <CheckCircle2 className="size-3 text-success ml-auto animate-in zoom-in duration-300" />}
                  </div>
                ))}
              </div>
            </section>

            <div className="pt-5 border-t border-border-icy flex flex-col gap-5">
              <section className="space-y-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Audit Activity
                </p>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-border-icy">
                  <Clock3 className="size-3.5 text-primary" />
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Last Saved</span>
                     <span className="text-[11px] font-bold text-foreground/80">
                       {formattedDate || "No drafts saved yet"}
                     </span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 w-fit shrink-0">
                  <AlertTriangle className="size-3.5 text-destructive" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive">
                    Active Channel
                  </p>
                </div>
                <div className="min-h-[360px] border border-border-icy rounded-2xl overflow-hidden bg-background/40">
                  <CourseConversation
                    courseId={courseId}
                    currentUserId={reviewerId}
                    escalations={escalations}
                    comments={comments}
                    sharedComments={sharedComments}
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
