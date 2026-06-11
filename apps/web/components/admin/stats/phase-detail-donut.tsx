"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { PhaseBreakdown } from "@coursebridge/workflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  phase: PhaseBreakdown
  /** Card title; defaults to "{phase.label} breakdown". */
  title?: string
  /** Optional caption under the title. */
  caption?: string
}

const SLICE_COLORS = ["#3b82f6", "#60a5fa", "#1d4ed8", "#0ea5e9", "#06b6d4", "#0891b2"]

/**
 * Donut of one pipeline phase's per-status counts. Used on the admin stats
 * page to surface the *Staging* breakdown — that's where ~95% of the work
 * sits right now, so a single 13-status pie hides the detail that matters.
 */
export function PhaseDetailDonut({ phase, title, caption }: Props) {
  const data = phase.statuses
    .filter((s) => s.count > 0)
    .map((s, i) => ({
      name: s.label,
      count: s.count,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))

  const cardTitle = title ?? `${phase.label} breakdown`

  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No courses currently in {phase.label.toLowerCase()}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          {cardTitle}
        </CardTitle>
        {caption && (
          <p className="text-xs text-muted-foreground">{caption}</p>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ top: "24px", bottom: "40px" }}
        >
          <span className="text-3xl font-black tabular-nums text-foreground">
            {phase.total.toLocaleString()}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            in {phase.label}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="46%"
              innerRadius={62}
              outerRadius={98}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                const pct = phase.total > 0 ? Math.round((d.count / phase.total) * 100) : 0
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-black text-foreground">{d.name}</p>
                    <p style={{ color: d.color }} className="font-semibold">
                      {d.count} courses — {pct}% of {phase.label.toLowerCase()}
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ paddingTop: 4, fontSize: 9, fontWeight: 700 }}
              formatter={(value) => (
                <span
                  style={{
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
