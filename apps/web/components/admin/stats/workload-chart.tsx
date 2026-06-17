"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { TAWorkload } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  taWorkload: TAWorkload[]
}

export function WorkloadChart({ taWorkload }: Props) {
  const data = [...taWorkload]
    .sort((a, b) => b.active_courses - a.active_courses)
    .slice(0, 12)
    .map((ta) => ({
      name: ta.full_name ?? (typeof ta.email === "string" ? ta.email.split("@")[0] : "Unknown"),
      active: ta.active_courses,
      fixes: ta.needs_fixes,
    }))

  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">TA Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No TA data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">TA Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 32 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fontWeight: 700, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
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
                    <p className="mb-1 font-black text-foreground">{label}</p>
                    {payload.map((p) => (
                      <p key={p.name} style={{ color: p.color }} className="font-semibold">
                        {p.name === "active" ? "Active" : "Needs Fixes"}: {p.value}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}
              formatter={(value) => (value === "active" ? "Active" : "Needs Fixes")}
            />
            <Bar dataKey="active" fill="#3b82f6" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="fixes" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
