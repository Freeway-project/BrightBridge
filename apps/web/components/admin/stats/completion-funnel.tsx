import type { StatusCount } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  statusCounts: StatusCount[]
  totalCourses: number
}

const FUNNEL_STAGES = [
  { label: "Created", statuses: ["course_created", "assigned_to_ta"] },
  { label: "TA Review", statuses: ["ta_review_in_progress", "submitted_to_admin", "admin_changes_requested"] },
  { label: "Admin", statuses: ["waiting_on_admin", "staging_in_progress", "ready_for_instructor"] },
  { label: "Instructor", statuses: ["sent_to_instructor", "instructor_questions", "instructor_approved"] },
  { label: "Approved", statuses: ["final_approved"] },
] as const

const STAGE_COLORS = ["#64748b", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"]

export function CompletionFunnel({ statusCounts, totalCourses }: Props) {
  const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const stages = FUNNEL_STAGES.map((stage, i) => {
    const count = stage.statuses.reduce((sum, s) => sum + (countMap[s] ?? 0), 0)
    const pct = totalCourses > 0 ? Math.round((count / totalCourses) * 100) : 0
    return { label: stage.label, count, pct, color: STAGE_COLORS[i] }
  })

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Completion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 py-2">
          {stages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-right text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                {stage.label}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted/30 h-5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 4 : 0)}%`,
                    backgroundColor: stage.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className="w-16 shrink-0 text-right">
                <span className="text-xs font-black text-foreground">{stage.count}</span>
                <span className="ml-1 text-[9px] text-muted-foreground/50">{stage.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
