import type { StatusCount } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import { PHASE_COLOR } from "./phase-colors"

interface Props {
  statusCounts: StatusCount[]
  totalCourses: number
}

export function CompletionFunnel({ statusCounts, totalCourses }: Props) {
  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const stages = getPhaseBreakdown(countByStatus).map((p) => ({
    label: p.label,
    count: p.total,
    pct: totalCourses > 0 ? Math.round((p.total / totalCourses) * 100) : 0,
    color: PHASE_COLOR[p.key],
  }))

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
