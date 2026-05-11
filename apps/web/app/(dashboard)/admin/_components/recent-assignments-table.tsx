import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AssignmentLog } from "@/lib/repositories/contracts"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RecentAssignmentsTable({ logs }: { logs: AssignmentLog[] }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold">Recent Assignments Trail</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-xs pl-4">Course</TableHead>
            <TableHead className="text-xs">Assigned To</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Assigned By</TableHead>
            <TableHead className="text-xs pr-4 text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                No recent assignments found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id} status="neutral" className="border-border">
                <TableCell className="pl-5 text-sm font-bold py-3">
                  {log.courseTitle}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{log.assignedUser.name ?? "—"}</span>
                    <span className="text-[11px] text-muted-foreground">{log.assignedUser.email}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={cn(
                    "capitalize text-[10px] px-1.5 py-0",
                    log.role === "instructor" ? "border-primary/40 bg-primary/10 text-primary" : "border-primary-depth bg-primary/5 text-muted-foreground"
                  )}>
                    {log.role}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-xs">{log.assignedBy.name ?? log.assignedBy.email}</span>
                </TableCell>
                <TableCell className="pr-4 text-right text-xs text-muted-foreground py-3">
                  {fmt(log.assignedAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
