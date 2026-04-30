import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { SuperAdminData } from "@/lib/super-admin/queries"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function AuditView({ data }: { data: SuperAdminData }) {
  const { auditEvents } = data

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs pl-4">Course</TableHead>
              <TableHead className="text-xs">Transition</TableHead>
              <TableHead className="text-xs">Actor</TableHead>
              <TableHead className="text-xs">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((e) => (
              <TableRow key={e.id} className="border-border">
                <TableCell className="pl-4 text-sm font-medium">{e.course_title}</TableCell>
                <TableCell className="text-xs">{e.from_status ?? "Initial"} → {e.to_status}</TableCell>
                <TableCell className="text-xs">{e.actor_name ?? e.actor_email}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmt(e.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
