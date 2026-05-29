"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { StatusCount } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STAGE_GROUPS = [
  { label: "Created",    statuses: ["course_created", "assigned_to_ta"],                                                    color: "#64748b" },
  { label: "TA Review",  statuses: ["ta_review_in_progress", "submitted_to_admin", "admin_changes_requested"],              color: "#3b82f6" },
  { label: "Admin",      statuses: ["waiting_on_admin", "staging_in_progress", "ready_for_instructor"],                      color: "#8b5cf6" },
  { label: "Instructor", statuses: ["sent_to_instructor", "instructor_questions", "instructor_approved"],                   color: "#f59e0b" },
  { label: "Approved",   statuses: ["final_approved"],                                                                      color: "#10b981" },
]

interface Props {
  statusCounts: StatusCount[]
  totalCourses: number
}

const RADIAN = Math.PI / 180

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, count, total }: any) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  if (pct < 6) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={10} fontWeight={800}>
      {count}
    </text>
  )
}

export function StatusPieChart({ statusCounts, totalCourses }: Props) {
  const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const data = STAGE_GROUPS
    .map((g) => ({
      name: g.label,
      count: g.statuses.reduce((sum, s) => sum + (countMap[s] ?? 0), 0),
      color: g.color,
    }))
    .filter((d) => d.count > 0)

  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Stage Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No course data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Stage Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {/* Center total */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ top: "24px", bottom: "40px" }}>
          <span className="text-3xl font-black tabular-nums" style={{ color: "var(--foreground)" }}>
            {totalCourses}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            total
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
              paddingAngle={3}
              dataKey="count"
              nameKey="name"
              labelLine={false}
              label={(props) => <PieLabel {...props} total={totalCourses} />}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                const pct = totalCourses > 0 ? Math.round((d.count / totalCourses) * 100) : 0
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-black text-foreground">{d.name}</p>
                    <p style={{ color: d.color }} className="font-semibold">{d.count} courses — {pct}%</p>
                  </div>
                )
              }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ paddingTop: 4, fontSize: 9, fontWeight: 700 }}
              formatter={(value) => (
                <span style={{ color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
