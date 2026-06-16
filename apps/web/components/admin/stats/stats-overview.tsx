"use client"

import type { PhaseBreakdown } from "@coursebridge/workflow"
import { AlertTriangle, ArrowRight, BookOpen, Clock3, UserRoundCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Props {
  totalCourses: number
  phases: PhaseBreakdown[]
}

type Tone = "blue" | "amber" | "orange" | "slate"

const TONE_STYLES: Record<Tone, { border: string; chip: string; value: string; glow: string }> = {
  blue: {
    border: "border-blue-500/20",
    chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    value: "text-blue-600 dark:text-blue-300",
    glow: "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 62%)",
  },
  amber: {
    border: "border-amber-500/20",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    value: "text-amber-600 dark:text-amber-300",
    glow: "radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 62%)",
  },
  orange: {
    border: "border-orange-500/20",
    chip: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
    value: "text-orange-600 dark:text-orange-300",
    glow: "radial-gradient(circle at top left, rgba(217,119,6,0.18), transparent 62%)",
  },
  slate: {
    border: "border-slate-500/20",
    chip: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
    value: "text-slate-600 dark:text-slate-300",
    glow: "radial-gradient(circle at top left, rgba(100,116,139,0.16), transparent 62%)",
  },
}

export function StatsOverview({ totalCourses, phases }: Props) {
  const phaseTotal = (key: PhaseBreakdown["key"]) =>
    phases.find((p) => p.key === key)?.total ?? 0

  const statusTotal = (status: string) =>
    phases.flatMap((phase) => phase.statuses).find((entry) => entry.status === status)?.count ?? 0

  const readyForInstructor = statusTotal("ready_for_instructor")
  const waitingOnAdmin = statusTotal("waiting_on_admin")
  const withInstructor = phaseTotal("instructor")
  const migrationBacklog = phaseTotal("migration")
  const downstreamActive = readyForInstructor + waitingOnAdmin + withInstructor
  const handoffShare = totalCourses > 0 ? Math.round((readyForInstructor / totalCourses) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card className="relative overflow-hidden border-blue-500/20 bg-card/80 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(14,165,233,0.06) 38%, transparent 72%), radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 36%)",
          }}
        />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex w-fit items-center rounded-full bg-blue-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
                Primary Queue
              </span>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {readyForInstructor.toLocaleString()} courses are staged and waiting for instructor handoff.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  This is the dominant downstream queue right now, so the page gives it more visual weight than migration leftovers.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[20rem]">
              <HeroStat
                label="Share Of Inventory"
                value={`${handoffShare}%`}
                sub="ready to send"
                icon={<ArrowRight className="size-4" />}
              />
              <HeroStat
                label="Downstream Active"
                value={downstreamActive.toLocaleString()}
                sub="staging + instructor"
                icon={<Clock3 className="size-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Total Inventory"
          value={totalCourses.toLocaleString()}
          sub="all migrated courses in CourseBridge"
          tone="slate"
          icon={<BookOpen className="size-4" />}
        />
        <MetricCard
          label="Waiting On Admin"
          value={waitingOnAdmin.toLocaleString()}
          sub={waitingOnAdmin > 0 ? "needs admin action" : "no admin queue right now"}
          tone="amber"
          icon={<Clock3 className="size-4" />}
        />
        <MetricCard
          label="With Instructor"
          value={withInstructor.toLocaleString()}
          sub={withInstructor > 0 ? "currently in instructor review" : "no courses with instructors"}
          tone="orange"
          icon={<UserRoundCheck className="size-4" />}
        />
        <MetricCard
          label="Migration Leftovers"
          value={migrationBacklog.toLocaleString()}
          sub={migrationBacklog > 0 ? "upstream tail, lower priority" : "migration phase effectively cleared"}
          tone="slate"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>
    </div>
  )
}

function HeroStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-background/75 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">{label}</p>
        <div className="rounded-full bg-blue-500/12 p-1.5 text-blue-600 dark:text-blue-300">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string
  value: string
  sub: string
  tone: Tone
  icon: React.ReactNode
}) {
  const styles = TONE_STYLES[tone]

  return (
    <Card className={cn("relative overflow-hidden bg-card/70 shadow-sm", styles.border)}>
      <div className="pointer-events-none absolute inset-0" style={{ background: styles.glow }} />
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", styles.chip)}>
            {label}
          </span>
          <div className={cn("rounded-full p-2", styles.chip)}>{icon}</div>
        </div>
        <p className={cn("mt-4 text-3xl font-black tracking-tight tabular-nums", styles.value)}>{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}
