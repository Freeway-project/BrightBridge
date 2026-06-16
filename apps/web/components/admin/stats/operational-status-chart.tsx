import type { PhaseBreakdown, PipelineStage } from "@coursebridge/workflow"
import { ArrowUpRight, Layers3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PHASE_COLOR } from "./phase-colors"

interface Props {
  phases: PhaseBreakdown[]
  totalCourses: number
}

type StatusRow = {
  status: string
  label: string
  count: number
  phase: PipelineStage
}

const PHASE_BADGE: Record<PipelineStage, string> = {
  migration: "Migration",
  staging: "Staging",
  instructor: "Instructor",
  provision: "Provision",
}

export function OperationalStatusChart({ phases, totalCourses }: Props) {
  const activeRows: StatusRow[] = phases
    .filter((phase) => phase.key !== "migration")
    .flatMap((phase) =>
      phase.statuses
        .filter((status) => status.count > 0)
        .map((status) => ({
          status: status.status,
          label: status.label,
          count: status.count,
          phase: phase.key,
        })),
    )
    .sort((a, b) => b.count - a.count)

  const migrationRows = phases.find((phase) => phase.key === "migration")?.statuses.filter((status) => status.count > 0) ?? []
  const migrationTotal = migrationRows.reduce((sum, row) => sum + row.count, 0)
  const maxCount = activeRows[0]?.count ?? 1
  const topStatus = activeRows[0] ?? null

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent" />
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Operational Queue By Status
            </CardTitle>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
              Downstream statuses are ranked by volume so the next release bottleneck is obvious without digging through completed migration work.
            </p>
          </div>
          {topStatus ? (
            <div className="rounded-2xl border border-blue-500/20 bg-background/75 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">Largest Queue</p>
              <p className="mt-1 text-sm font-bold text-foreground">{topStatus.label}</p>
              <p className="text-xs text-muted-foreground">{topStatus.count.toLocaleString()} courses</p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5">
        {activeRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No active downstream queue right now.</p>
        ) : (
          <div className="space-y-3">
            {activeRows.map((row, index) => {
              const shareOfTotal = totalCourses > 0 ? Math.round((row.count / totalCourses) * 100) : 0
              const width = Math.max(6, Math.round((row.count / maxCount) * 100))
              return (
                <div key={row.status} className="rounded-2xl border border-border/60 bg-background/55 p-3 transition-colors hover:border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{row.label}</p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]"
                              style={{ backgroundColor: `${PHASE_COLOR[row.phase]}1A`, color: PHASE_COLOR[row.phase] }}
                            >
                              {PHASE_BADGE[row.phase]}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{shareOfTotal}% of all courses</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black tabular-nums text-foreground">{row.count.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: PHASE_COLOR[row.phase] }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Layers3 className="size-4 text-slate-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">Migration Tail</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Left visible, but deliberately compressed. These are upstream leftovers rather than the main operational queue.
            </p>
            {migrationRows.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {migrationRows.map((row) => (
                  <span key={row.status} className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                    {row.shortLabel}: <span className="font-semibold text-foreground">{row.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">No courses remain in migration statuses.</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-4 py-3 md:min-w-[10rem] md:flex-col md:items-end md:justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">Tail Total</p>
            <div className="flex items-center gap-1 text-foreground">
              <ArrowUpRight className="size-4 text-slate-500" />
              <span className="text-2xl font-black tabular-nums">{migrationTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
