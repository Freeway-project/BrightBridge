"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Polls /api/chat/unread-count every 30 s and subscribes to the user's
 * Supabase notification channel for instant updates.
 *
 * Returns `count` (current unread total) and `bump` (increments each time
 * the count goes up — use as a React key to re-trigger CSS enter animations).
 */
export function useChatUnreadCount(userId: string) {
  const [count, setCount] = useState(0)
  const [bump, setBump] = useState(0)
  const prev = useRef<number | null>(null)

  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/chat/unread-count", { cache: "no-store" })
        if (!res.ok) return
        const { count: n = 0 } = (await res.json()) as { count: number }
        if (prev.current !== null && n > prev.current) {
          setBump((b) => b + 1)
        }
        prev.current = n
        setCount(n)
      } catch { /* best-effort */ }
    }

    void refresh()
    const timer = setInterval(() => void refresh(), 30_000)

    const supabase = createClient()
    let ch: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null
    if (supabase) {
      ch = supabase.channel(`notifications:${userId}`)
      ch.on("broadcast", { event: "new" }, () => void refresh())
      ch.subscribe()
    }

    return () => {
      clearInterval(timer)
      if (supabase && ch) void supabase.removeChannel(ch)
    }
  }, [userId])

  return { count, bump }
}
