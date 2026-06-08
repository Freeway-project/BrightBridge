import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PhaseBreakdown as PhaseBreakdownData } from "@coursebridge/workflow"
import { PHASE_COLOR } from "./phase-colors"

export function PhaseBreakdown({ breakdown }: { breakdown: PhaseBreakdownData[] }) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {breakdown.map((phase) => (
          <div key={phase.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: PHASE_COLOR[phase.key] }} />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">{phase.label}</span>
              <span className={cn("ml-auto text-sm font-black tabular-nums", phase.total === 0 ? "text-muted-foreground/40" : "text-foreground")}>{phase.total}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-xs">
              {phase.statuses.map((s, i) => (
                <span key={s.status} className="flex items-center gap-1">
                  <span className={s.count === 0 ? "text-muted-foreground/40" : "text-muted-foreground"}>
                    {s.shortLabel}
                  </span>
                  <span className={cn("font-bold tabular-nums", s.count === 0 ? "text-muted-foreground/40" : "text-foreground")}>
                    {s.count}
                  </span>
                  {i < phase.statuses.length - 1 && <span className="text-muted-foreground/30">·</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
