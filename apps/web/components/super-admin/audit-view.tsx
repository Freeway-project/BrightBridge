"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { loadMoreAuditEvents } from "@/app/(dashboard)/super-admin/actions"
import type { AuditEvent, PaginatedResult } from "@/lib/repositories/contracts"

const DEFAULT_PAGE_SIZE = 30

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Audit Trail list with scroll-based pagination.
 *
 * Two modes:
 *  - server-seeded (`initial` provided): fast first paint for the dedicated
 *    Audit page and the provost card.
 *  - self-loading (`initial` omitted): the list fetches its own first page on
 *    the client. Used by the super-admin dashboard tab so the list is fully
 *    owned by client state and is NOT reset/reloaded by the dashboard's 30s
 *    auto-refresh (router.refresh re-renders the server tree but can't touch
 *    this component's accumulated pages).
 *
 * Every page is fetched fresh from the DB via the server action — nothing is
 * cached, so newly written events always show up.
 */
export function AuditView({ initial }: { initial?: PaginatedResult<AuditEvent> }) {
  const pageSize = initial?.pageSize ?? DEFAULT_PAGE_SIZE
  const [events, setEvents] = useState<AuditEvent[]>(initial?.data ?? [])
  const [page, setPage] = useState(initial?.page ?? 0)
  // Unknown (null) until the first page loads when not server-seeded.
  const [totalPages, setTotalPages] = useState<number | null>(initial?.totalPages ?? null)
  const [loading, setLoading] = useState(false)

  // Before we know the total (self-loading, page 0) assume there's a first page.
  const hasMore = totalPages === null ? page === 0 : page < totalPages

  const sentinelRef = useRef<HTMLDivElement>(null)
  // Synchronous in-flight guard so the mount effect + observer can't double-fetch.
  const inFlightRef = useRef(false)
  // Latest values for the observer callback without re-subscribing each render.
  const stateRef = useRef({ hasMore, page })
  stateRef.current = { hasMore, page }

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !stateRef.current.hasMore) return
    inFlightRef.current = true
    setLoading(true)
    const nextPage = stateRef.current.page + 1
    try {
      const result = await loadMoreAuditEvents(nextPage, pageSize)
      setEvents((prev) => [...prev, ...result.data])
      setPage(result.page)
      setTotalPages(result.totalPages)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [pageSize])

  // Self-loading mode: pull the first page on mount when not server-seeded.
  useEffect(() => {
    if (page === 0) void loadMore()
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // Observe against the viewport (root: null). IntersectionObserver clips by
    // any intervening scroll container, so this works whether the surrounding
    // page scrolls (dashboard tab / provost card) or this component owns the
    // scroll area (dedicated Audit Trail page). The generous rootMargin
    // prefetches the next page well before the bottom, so scrolling stays smooth.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "400px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const initialLoading = loading && events.length === 0

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
            {initialLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Loading…</span>
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id} className="border-border">
                  <TableCell className="pl-4 text-sm font-medium">{e.course_title}</TableCell>
                  <TableCell className="text-xs">
                    {e.from_status ?? "Initial"} → {e.to_status}
                    {e.kind === "admin_override" && (
                      <span className="ml-2 inline-flex items-center rounded border border-orange-400/30 bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-500">
                        Admin override
                      </span>
                    )}
                  </TableCell>
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
      {hasMore && !initialLoading && (
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
