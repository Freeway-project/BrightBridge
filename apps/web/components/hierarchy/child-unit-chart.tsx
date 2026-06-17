"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { OrgChild } from "@/lib/hierarchy/explorer-queries"

export function ChildUnitChart({ children, title = "Sub-unit Course Throughput" }: { children: OrgChild[], title?: string }) {
  // Sort units by course count for the chart
  const data = [...children].sort((a, b) => b.courseCount - a.courseCount)

  return (
    <Card className="h-full border-border/60 shadow-sm flex flex-col bg-background/80 backdrop-blur transition-all duration-500 hover:shadow-md hover:border-primary/20">
      <CardHeader className="px-4 pb-0 pt-4 flex-none">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          Course throughput and distribution across {data.length} sub-units.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.8 }} 
              width={140}
            />
            <Tooltip
              cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                      <p className="font-semibold">{d.name}</p>
                      <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
                        <span className="flex justify-between gap-4">
                          <span>Total Courses:</span>
                          <span className="font-medium text-foreground">{d.courseCount}</span>
                        </span>
                        <span className="flex justify-between gap-4">
                          <span>Faculty/Staff:</span>
                          <span className="font-medium text-foreground">{d.memberCount}</span>
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="courseCount" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} className="fill-primary/80 hover:fill-primary transition-colors duration-300" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
