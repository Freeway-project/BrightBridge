import { CheckCircle2, Circle, Clock3, AlertCircle } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SectionProgress = {
  key: string
  label: string
  complete: boolean
}

type InfoPanelProps = {
  courseStatus: CourseStatus
  reviewerName: string
  progress: SectionProgress[]
  lastSavedAt: string | null
}

export function InfoPanel({
  courseStatus,
  reviewerName,
  progress,
  lastSavedAt,
}: InfoPanelProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-border bg-sidebar/5 p-6 xl:block">
      <div className="flex flex-col h-full gap-8">
        <section className="space-y-3">
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
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-[11px] text-muted-foreground">Admin: <span className="text-foreground/70 italic">Pending assignment</span></p>
              <p className="text-[11px] text-muted-foreground">Instructor: <span className="text-foreground/70 italic">Pending selection</span></p>
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

        <div className="mt-auto pt-6 border-t border-border/50 space-y-4">
          <section className="space-y-2">
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

          <Button variant="destructive" size="sm" className="w-full h-9 text-xs font-bold gap-2">
            <AlertCircle className="size-3.5" />
            Report Major Issue
          </Button>
        </div>
      </div>
    </aside>
  )
}
