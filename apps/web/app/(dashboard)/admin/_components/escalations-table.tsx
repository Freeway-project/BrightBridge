"use client"

import { useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { OpenEscalationRow } from "@/lib/services/escalations"
import { resolveEscalationAction } from "../actions"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-400/30",
  major:    "bg-orange-500/15 text-orange-600 border-orange-400/30",
  minor:    "bg-yellow-500/15 text-yellow-700 border-yellow-400/30",
}

interface Props {
  escalations: OpenEscalationRow[]
}

export function EscalationsTable({ escalations }: Props) {
  if (escalations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <CheckCircle2 className="size-10 text-green-500/50" />
        <p className="text-sm font-medium">No open escalations</p>
        <p className="text-xs">All issues have been resolved.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[--border-default] overflow-hidden bg-[--surface-2]">
      <table className="w-full text-sm">
        <thead className="bg-[--surface-4]">
          <tr className="border-b border-[--border-subtle]">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raised by</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latest message</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[--border-subtle]">
          {escalations.map((row) => (
            <EscalationRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EscalationRow({ row }: { row: OpenEscalationRow }) {
  const [isPending, startTransition] = useTransition()

  function handleResolve() {
    startTransition(async () => {
      await resolveEscalationAction(row.id, row.course_id)
    })
  }

  return (
    <tr className={cn("bg-transparent hover:bg-[--surface-3]/50 transition-colors", isPending && "opacity-50")}>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground leading-tight">{row.course_title}</p>
        {row.course_source_id && (
          <p className="text-[11px] text-muted-foreground font-mono">{row.course_source_id}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {row.severity === "critical" && (
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
            SEVERITY_STYLES[row.severity]
          )}>
            <AlertTriangle className="size-2.5" />
            {row.severity}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{row.title}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-muted-foreground">{row.author_name ?? row.author_email ?? "—"}</p>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {row.latest_message ? (
          <p className="text-xs text-muted-foreground truncate">{row.latest_message}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">No messages</p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 hover:bg-[--surface-4]" asChild>
            <Link href={`/admin/courses/${row.course_id}`}>
              <ExternalLink className="size-3" />
              View
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white border-none"
            disabled={isPending}
            onClick={handleResolve}
          >
            <CheckCircle2 className="size-3" />
            Resolve
          </Button>
        </div>
      </td>
    </tr>
  )
}
