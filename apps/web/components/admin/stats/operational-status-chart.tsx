import type { PhaseBreakdown, PipelineStage } from "@coursebridge/workflow"
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
  phaseLabel: string
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
          phaseLabel: phase.label,
        })),
    )
    .sort((a, b) => b.count - a.count)

  const migrationRows = phases
    .find((phase) => phase.key === "migration")
    ?.statuses.filter((status) => status.count > 0) ?? []

  const migrationTotal = migrationRows.reduce((sum, row) => sum + row.count, 0)
  const maxCount = activeRows[0]?.count ?? 1

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Operational Queue By Status
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Detail is concentrated on downstream work because migration is largely complete.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {activeRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No active downstream queue right now.
          </p>
        ) : (
          <div className="space-y-4">
            {activeRows.map((row) => {
              const shareOfTotal = totalCourses > 0 ? Math.round((row.count / totalCourses) * 100) : 0
              const width = Math.max(6, Math.round((row.count / maxCount) * 100))
              return (
                <div key={row.status} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PHASE_COLOR[row.phase] }}
                          aria-hidden
                        />
                        <p className="truncate text-sm font-semibold text-foreground">{row.label}</p>
                        <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {PHASE_BADGE[row.phase]}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black tabular-nums text-foreground">{row.count.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{shareOfTotal}% of total</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, backgroundColor: PHASE_COLOR[row.phase] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">
              Migration Tail
            </p>
            <p className="text-sm font-black tabular-nums text-foreground">{migrationTotal.toLocaleString()}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Kept collapsed because these are upstream leftovers, not the main operational bottleneck.
          </p>
          {migrationRows.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {migrationRows.map((row) => (
                <span
                  key={row.status}
                  className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {row.shortLabel}: <span className="font-semibold text-foreground">{row.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">No courses remain in migration statuses.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
