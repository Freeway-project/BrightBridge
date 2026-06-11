"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Search, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { resolveSupportMessageAction } from "@/app/(dashboard)/support/actions"
import { cn } from "@/lib/utils"
import type { PaginatedResult } from "@/lib/repositories/contracts"
import type { SupportMessageRow } from "@/lib/super-admin/queries"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

function senderName(message: SupportMessageRow): string {
  const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender
  return sender?.full_name?.trim() || "Unknown user"
}

function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "standard_user": return "TA"
    case "admin_full": return "Admin"
    case "admin_viewer": return "Admin (viewer)"
    case "instructor": return "Instructor"
    case "super_admin": return "Super Admin"
    default: return role ?? "—"
  }
}

export function SupportMessagesView({ result, search }: { result: PaginatedResult<SupportMessageRow>, search: string }) {
  const { data: messages, total, page, totalPages } = result

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="shrink-0 text-sm text-muted-foreground">{total.toLocaleString()} support {total === 1 ? "message" : "messages"}</p>
        <form method="GET" action="/super-admin" className="relative min-w-0 w-full sm:w-64 sm:shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search messages…"
            className="pl-8 h-8 text-sm"
            defaultValue={search}
          />
        </form>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-xs pl-4 w-[120px]">Type</TableHead>
              <TableHead className="text-xs">From</TableHead>
              <TableHead className="text-xs">Message</TableHead>
              <TableHead className="text-xs w-[110px]">Status</TableHead>
              <TableHead className="text-xs w-[150px]">When</TableHead>
              <TableHead className="text-xs w-[120px] text-right pr-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No support messages yet.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((m) => (
                <TableRow key={m.id} className="border-border">
                  <TableCell className="pl-4 align-top">
                    {m.type === "poke" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Zap className="size-3" /> Poke
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Message
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    <p className="font-medium text-foreground">{senderName(m)}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(m.sender_role)}</p>
                  </TableCell>
                  <TableCell className="max-w-[24rem] whitespace-normal break-words align-top text-sm">
                    {m.subject ? <p className="font-medium text-foreground">{m.subject}</p> : null}
                    <p className="text-xs text-muted-foreground">{m.body}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusPill status={m.status} />
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-xs text-muted-foreground">{fmt(m.created_at)}</TableCell>
                  <TableCell className="pr-4 align-top text-right">
                    {m.status !== "resolved" && <ResolveButton id={m.id} />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} totalItems={total} />
    </div>
  )
}

function StatusPill({ status }: { status: SupportMessageRow["status"] }) {
  const styles = {
    open: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    read: "border-border bg-muted text-muted-foreground",
    resolved: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  }[status]
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", styles)}>
      {status}
    </span>
  )
}

function ResolveButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function resolve() {
    startTransition(async () => {
      const result = await resolveSupportMessageAction(id)
      if (result.kind === "error") {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={pending} onClick={resolve}>
      <Check className="size-3.5" />
      {pending ? "Resolving…" : "Resolve"}
    </Button>
  )
}
