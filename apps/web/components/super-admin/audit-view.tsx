"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { loadMoreAuditEvents } from "@/app/(dashboard)/super-admin/actions"
import type { AuditEvent, PaginatedResult } from "@/lib/repositories/contracts"

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

export function AuditView({ initial }: { initial: PaginatedResult<AuditEvent> }) {
  const [events, setEvents] = useState<AuditEvent[]>(initial.data)
  const [page, setPage] = useState(initial.page)
  const [loading, setLoading] = useState(false)
  const hasMore = page < initial.totalPages

  const sentinelRef = useRef<HTMLDivElement>(null)
  // Hold latest values for the observer callback without re-subscribing each render.
  const stateRef = useRef({ loading, hasMore, page })
  stateRef.current = { loading, hasMore, page }

  const loadMore = useCallback(async () => {
    if (stateRef.current.loading || !stateRef.current.hasMore) return
    setLoading(true)
    const nextPage = stateRef.current.page + 1
    try {
      const result = await loadMoreAuditEvents(nextPage, initial.pageSize)
      setEvents((prev) => [...prev, ...result.data])
      setPage(result.page)
    } finally {
      setLoading(false)
    }
  }, [initial.pageSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // Observe against the viewport (root: null). IntersectionObserver clips by
    // any intervening scroll container, so this works whether the surrounding
    // page scrolls (dashboard tabs / provost card) or this component owns the
    // scroll area (dedicated Audit Trail page).
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "200px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

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
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id} className="border-border">
                  <TableCell className="pl-4 text-sm font-medium">{e.course_title}</TableCell>
                  <TableCell className="text-xs">{e.from_status ?? "Initial"} → {e.to_status}</TableCell>
                  <TableCell className="text-xs">
                    {e.actor_name ?? e.actor_email}
                    {e.on_behalf_of_name && (
                      <span className="text-muted-foreground"> → on behalf of {e.on_behalf_of_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(e.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sentinel: scrolling it into view fetches the next page. */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading more…</span>
          ) : (
            <span>Scroll to load more</span>
          )}
        </div>
      )}
    </div>
  )
}
