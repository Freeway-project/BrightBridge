"use client"

import { HelpCircle } from "lucide-react"
import { PHASE_DESCRIPTIONS, PHASE_KPI_LABELS, type PhaseBreakdown } from "@coursebridge/workflow"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { PHASE_COLOR } from "./phase-colors"

interface Props {
  phases: PhaseBreakdown[]
  totalCourses: number
}

/**
 * Top-of-page funnel: one pill per pipeline phase, connected by arrows.
 * Each pill shows count + % of total, and exposes a tooltip explaining
 * the phase in plain English (admin/provost-friendly).
 */
export function PipelineTimeline({ phases, totalCourses }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6 pb-5">
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {phases.flatMap((phase, idx) => {
              const pct = totalCourses > 0 ? (phase.total / totalCourses) * 100 : 0
              const pctLabel = pct >= 1 ? `${Math.round(pct)}%` : pct > 0 ? "<1%" : "0%"
              const color = PHASE_COLOR[phase.key]
              const kpiLabel = PHASE_KPI_LABELS[phase.key]
              const description = PHASE_DESCRIPTIONS[phase.key]

              const pill = (
                <Tooltip key={phase.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full flex-col items-start gap-1.5 rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-left transition-colors hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                          {kpiLabel}
                        </span>
                        <HelpCircle className="size-3 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/70" aria-hidden />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black tabular-nums text-foreground">
                          {phase.total.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                          {pctLabel}
                        </span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold">{phase.label}</p>
                    <p className="mt-1 text-muted-foreground">{description}</p>
                  </TooltipContent>
                </Tooltip>
              )

              if (idx === phases.length - 1) return [pill]

              const connector = (
                <div
                  key={`${phase.key}-arrow`}
                  className="hidden items-center justify-center text-muted-foreground/40 md:flex"
                  aria-hidden
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 10h10m0 0l-4-4m4 4l-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )

              return [pill, connector]
            })}
          </div>

          {totalCourses > 0 && (
            <FunnelBar phases={phases} totalCourses={totalCourses} className="mt-4" />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

function FunnelBar({
  phases,
  totalCourses,
  className,
}: {
  phases: PhaseBreakdown[]
  totalCourses: number
  className?: string
}) {
  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted/40", className)}>
      {phases.map((phase) => {
        const width = (phase.total / totalCourses) * 100
        if (width <= 0) return null
        return (
          <div
            key={phase.key}
            style={{ width: `${width}%`, backgroundColor: PHASE_COLOR[phase.key] }}
            aria-label={`${PHASE_KPI_LABELS[phase.key]}: ${phase.total}`}
          />
        )
      })}
    </div>
  )
}
