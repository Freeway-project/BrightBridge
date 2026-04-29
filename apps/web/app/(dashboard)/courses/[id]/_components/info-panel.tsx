import { CheckCircle2, Circle, Clock3 } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"

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
    <aside className="hidden w-72 shrink-0 border-l border-border bg-background p-5 xl:block">
      <div className="space-y-5">
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
          <StatusBadge status={courseStatus} />
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">People</p>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{reviewerName}</p>
            <p className="text-xs text-muted-foreground">Assigned TA</p>
            <p className="pt-2 text-xs text-muted-foreground">Admin: pending assignment</p>
            <p className="text-xs text-muted-foreground">Instructor: pending selection</p>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Progress</p>
          <div className="space-y-2">
            {progress.map((item) => (
              <div className="flex items-center gap-2 text-xs" key={item.key}>
                {item.complete ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "truncate",
                    item.complete ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Last saved</p>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
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
      </div>
    </aside>
  )
}
