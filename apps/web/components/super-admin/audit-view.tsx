import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SuperAdminData } from "@/lib/super-admin/queries"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function AuditView({ data }: { data: SuperAdminData }) {
  const { auditEvents } = data

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
      <div className="flex items-center gap-2 mb-2">
        <p className="shrink-0 text-sm font-semibold text-foreground">{auditEvents.length} recent events</p>
        <span className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-bold text-info uppercase tracking-wider">Audit Log</span>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/30">
              <TableHead className="text-[11px] uppercase tracking-wider font-bold pl-6">Course Target</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status Transition</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold">Responsible Actor</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold w-[120px] text-right pr-6">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((e, idx) => {
              const bgClass = idx % 2 === 0 ? "bg-card" : "bg-secondary/50"
              return (
                <TableRow key={e.id} className={cn("group border-b border-border border-l-[3px] border-l-primary/30 transition-colors hover:bg-primary/5", bgClass)}>
                  <TableCell className="pl-6 py-4 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{e.course_title}</TableCell>
                  <TableCell className="text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/60">{e.from_status ?? <span className="italic font-normal">Initial</span>}</span>
                      <span className="text-primary/50 font-normal">→</span>
                      <span className="text-foreground">{e.to_status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] font-semibold text-muted-foreground/80">{e.actor_name ?? e.actor_email}</TableCell>
                  <TableCell className="text-[11px] text-right pr-6 font-bold text-muted-foreground/70">{fmt(e.created_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
