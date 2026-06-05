"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import type { StatusCount } from "@/lib/repositories/contracts"
import { COURSE_STATUS_LABELS, WORKFLOW_PHASES, getPipelineStage } from "@coursebridge/workflow"
import { PHASE_COLOR } from "./phase-colors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


interface Props {
  statusCounts: StatusCount[]
  totalCourses: number
}

export function StagePipeline({ statusCounts, totalCourses }: Props) {
  const STATUS_ORDER = WORKFLOW_PHASES.flatMap((p) => p.groups.map((g) => g.statuses[0]))

  const data = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      status: s.status,
      label: COURSE_STATUS_LABELS[s.status] ?? s.status,
      count: s.count,
      pct: totalCourses > 0 ? Math.round((s.count / totalCourses) * 100) : 0,
      color: PHASE_COLOR[getPipelineStage(s.status)],
    }))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Pipeline — Courses by Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ fontSize: 10, fontWeight: 600, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-black text-foreground">{d.label}</p>
                    <p className="text-muted-foreground">{d.count} courses — {d.pct}%</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: 10, fontWeight: 700, fill: "var(--muted-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
