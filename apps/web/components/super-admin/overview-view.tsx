import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/courses/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { type CourseStatus } from "@coursebridge/workflow"
import type { SuperAdminData } from "@/lib/super-admin/queries"

const STATUS_ORDER: CourseStatus[] = [
  "course_created", "assigned_to_ta", "ta_review_in_progress",
  "submitted_to_admin", "admin_changes_requested", "ready_for_instructor",
  "sent_to_instructor", "instructor_questions", "instructor_approved", "final_approved",
]

export function OverviewView({ data }: { data: SuperAdminData }) {
  const { statusCounts, taWorkload } = data

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))

  const totalCourses = statusCounts.reduce((acc, curr) => acc + curr.count, 0)
  const inProgress  = countByStatus["ta_review_in_progress"] ?? 0
  const pendingAdmin = (countByStatus["submitted_to_admin"] ?? 0) + (countByStatus["admin_changes_requested"] ?? 0)
  const withInstructor = (countByStatus["sent_to_instructor"] ?? 0) + (countByStatus["instructor_questions"] ?? 0)
  const completed = countByStatus["final_approved"] ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Courses"    value={totalCourses}    icon="book-open" />
        <StatCard label="Staff In Progress"   value={inProgress}      icon="clock" />
        <StatCard label="Pending Admin"    value={pendingAdmin}    icon="check-square" />
        <StatCard label="With Instructor"  value={withInstructor}  icon="book-open" />
        <StatCard label="Completed"        value={completed}       icon="check-square" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = countByStatus[status] ?? 0
              if (count === 0) return null
              return (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
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
                      <TableCell className="pl-4 py-2">
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
