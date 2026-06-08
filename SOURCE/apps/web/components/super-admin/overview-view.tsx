import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/shared/stat-card"
import { PhaseBreakdown } from "@/components/admin/stats/phase-breakdown"
import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import type { SuperAdminData } from "@/lib/super-admin/queries"

export function OverviewView({ data }: { data: SuperAdminData }) {
  const { totalCourses, statusCounts, taWorkload } = data

  const countByStatus: Partial<Record<CourseStatus, number>> =
    Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const completed = countByStatus["final_approved"] ?? 0
  const completedPct = totalCourses > 0 ? Math.round((completed / totalCourses) * 100) : 0
  const breakdown = getPhaseBreakdown(countByStatus)

  return (
    <div className="min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-6 max-w-md">
        <StatCard label="Total Courses" value={totalCourses} icon="book-open" />
        <StatCard label="Completed" value={completed} icon="check-square" sub={`${completedPct}% of total`} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PhaseBreakdown breakdown={breakdown} />
        </div>

        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff Workload</CardTitle>
          </CardHeader>
          <CardContent className="p-0 border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border bg-muted/30">
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
                    <TableRow key={ta.id} className="border-border">
                      <TableCell className="min-w-0 whitespace-normal py-2 pl-4">
                        <p className="text-sm font-medium break-words">{ta.full_name ?? ta.email}</p>
                        {ta.full_name && <p className="text-[11px] text-muted-foreground break-all">{ta.email}</p>}
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
