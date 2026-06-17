"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { AuditEvent } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, subDays, startOfDay } from "date-fns"

interface Props {
  auditEvents: AuditEvent[]
}

export function ActivityTrend({ auditEvents }: Props) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i)
    return { date: format(d, "MMM d"), key: format(d, "yyyy-MM-dd"), count: 0 }
  })

  for (const ev of auditEvents) {
    // `new Date(...)` tolerates both ISO strings and Date objects, matching how
    // every other created_at consumer in the app parses these values.
    const key = format(new Date(ev.created_at), "yyyy-MM-dd")
    const slot = days.find((d) => d.key === key)
    if (slot) slot.count++
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Activity — Last 30 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={days} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => String(v)}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-black text-foreground">{label}</p>
                    <p className="text-muted-foreground">{payload[0].value} transitions</p>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#activityGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
