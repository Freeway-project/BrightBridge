"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const POLL_MS = 30_000

export function ChatUpdater({ userId }: { userId: string }) {
  const router = useRouter()
  const prevCount = useRef<number | null>(null)
  const baseTitle = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission()
    }

    async function poll() {
      try {
        const res = await fetch("/api/chat/unread-count", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { count: number }
        const count = data.count ?? 0

        const stripped = baseTitle.current ?? document.title.replace(/^\(\d+\) /, "")
        if (!baseTitle.current) baseTitle.current = stripped
        document.title = count > 0 ? `(${count}) ${stripped}` : stripped

        if (prevCount.current !== null && count > prevCount.current) {
          router.refresh()

          // Toast when not already on the chat page
          if (!window.location.pathname.startsWith("/chat")) {
            const delta = count - prevCount.current
            toast.info("💬 New chat message", {
              description:
                delta === 1 ? "You have 1 new message" : `You have ${delta} new messages`,
              action: { label: "Open", onClick: () => router.push("/chat") },
            })
          }

          if (
            document.visibilityState !== "visible" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification("New message", {
              body: "You have unread chat messages",
              icon: "/favicon.ico",
            })
          }
        }

        prevCount.current = count
      } catch {
        // best-effort
      }
    }

    void poll()
    timerRef.current = setInterval(() => void poll(), POLL_MS)

    const supabase = createClient()
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null
    if (supabase) {
      channel = supabase.channel(`notifications:${userId}`)
      channel.on("broadcast", { event: "new" }, () => {
        void poll()
      })
      channel.subscribe()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (baseTitle.current) document.title = baseTitle.current
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return null
}

export default ChatUpdater
