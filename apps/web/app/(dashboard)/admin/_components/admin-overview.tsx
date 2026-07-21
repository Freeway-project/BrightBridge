import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/shared/stat-card"
import { PhaseBreakdown } from "@/components/admin/stats/phase-breakdown"
import { HandoffSummaryView } from "@/components/admin/handoff/handoff-summary"
import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import type { AdminOverviewData, InstructorHandoffData } from "@/lib/admin/queries"

type Props = {
  data: AdminOverviewData
  /** Instructor handoff stats; omitted when the handoff query failed. */
  handoff?: InstructorHandoffData
}

export function AdminOverview({ data, handoff }: Props) {
  const { totalCourses, statusCounts, taWorkload } = data

  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const completed = countByStatus["final_approved"] ?? 0
  const completedPct = totalCourses > 0 ? Math.round((completed / totalCourses) * 100) : 0
  const breakdown = getPhaseBreakdown(countByStatus)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 max-w-md">
        <StatCard label="Total Courses" value={totalCourses} icon="book-open" />
        <StatCard label="Completed" value={completed} icon="check-square" sub={`${completedPct}% of total`} />
      </div>

      {handoff && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Instructor Handoff
            </h2>
            <Link
              href="/admin/stats"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Full tracker
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <HandoffSummaryView summary={handoff.summary} byInstructor={handoff.byInstructor} />
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PhaseBreakdown breakdown={breakdown} />
        </div>

        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Staff Workload</CardTitle>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-[10px] uppercase font-bold pl-4 h-9">Staff</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-center h-9">Active</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-center h-9">Needs Fixes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taWorkload.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs py-8">No staff assigned.</TableCell></TableRow>
                ) : (
                  taWorkload.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="py-2 pl-4">
                        <p className="text-sm font-medium">{ta.full_name ?? ta.email}</p>
                        {ta.full_name && <p className="text-[11px] text-muted-foreground">{ta.email}</p>}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{ta.active_courses}</TableCell>
                      <TableCell className="text-center">
                        {ta.needs_fixes > 0 ? (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                            {ta.needs_fixes}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
