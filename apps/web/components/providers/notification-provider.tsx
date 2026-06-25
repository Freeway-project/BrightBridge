"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Role } from "@coursebridge/workflow"
import type { NotificationItem } from "@/lib/notifications/queries"
import { createClient } from "@/lib/supabase/client"


let audioContext: AudioContext | null = null

function playNotificationTone(type: "info" | "success" | "warning" = "info") {
  if (typeof window === "undefined") return

  try {
    audioContext ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioContext.state === "suspended") {
      void audioContext.resume()
    }

    const now = audioContext.currentTime
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const chirpMap: Record<typeof type, { start: number; peak: number; tail: number }> = {
      info: { start: 1200, peak: 2100, tail: 1550 },
      success: { start: 1300, peak: 2400, tail: 1800 },
      warning: { start: 900, peak: 1700, tail: 1200 },
    }

    const preset = chirpMap[type]
    osc.type = "triangle"
    osc.frequency.setValueAtTime(preset.start, now)
    osc.frequency.exponentialRampToValueAtTime(preset.peak, now + 0.055)
    osc.frequency.exponentialRampToValueAtTime(preset.tail, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.006, now + 0.07)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start(now)
    osc.stop(now + 0.17)
  } catch {
    // Best-effort UI enhancement only.
  }
}


interface NotificationProviderProps {
  children: React.ReactNode
  userId: string
  role: Role
}

type NotificationFeedResponse = {
  notifications: NotificationItem[]
  pendingCount: number
}

// Polling notification provider. Replaces the Supabase Realtime channel
// subscriptions (which don't work against self-hosted Postgres) with a 15s poll
// of /api/notifications/feed, which is backed by getNotificationsPageData and
// therefore covers every source (issues, comments, status events, assignments,
// support messages, reassignments) under both DB providers. New items since the
// last poll are toasted; a change in pendingCount refreshes server components.
export function NotificationProvider({ children, userId, role }: NotificationProviderProps) {
  const router = useRouter()
  const seenIds = useRef(new Set<string>())
  const initialLoadDone = useRef(false)
  const pendingCountRef = useRef<number | null>(null)

  // Pre-enable AudioContext on user interaction to bypass browser autoplay restrictions
  useEffect(() => {
    if (typeof window === "undefined") return

    const initAudio = () => {
      try {
        audioContext ??= new (window.AudioContext || (window as any).webkitAudioContext)()
        if (audioContext.state === "suspended") {
          void audioContext.resume()
        }
      } catch (e) {
        // best-effort
      }
    }

    const handleInteraction = () => {
      initAudio()
      cleanup()
    }

    const cleanup = () => {
      window.removeEventListener("click", handleInteraction)
      window.removeEventListener("keydown", handleInteraction)
      window.removeEventListener("touchstart", handleInteraction)
    }

    window.addEventListener("click", handleInteraction)
    window.addEventListener("keydown", handleInteraction)
    window.addEventListener("touchstart", handleInteraction)

    return cleanup
  }, [])

  useEffect(() => {
    if (!userId) return

    function dedup(id: string): boolean {
      if (seenIds.current.has(id)) return false
      seenIds.current.add(id)
      return true
    }

    function iconFor(item: NotificationItem): string {
      if (item.kind === "comment") return "💬"
      return "❓" // course_action (instructor_questions)
    }

    function labelFor(item: NotificationItem): string {
      if (item.kind === "comment") return "Instructor message"
      return "Instructor questions"
    }

    function showNotification(item: NotificationItem) {
      const icon = iconFor(item)
      const label = labelFor(item)
      const content = (
        <div className="space-y-1.5">
          <p className="font-semibold">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
          <p className="text-xs text-muted-foreground">{item.meta}</p>
        </div>
      )

      const options = {
        description: content,
        duration: Infinity,
        action: { label: "Open", onClick: () => router.push(item.href) },
      }

      if (item.tone === "success") {
        toast.success(`${icon} ${label}`, options)
        playNotificationTone("success")
      } else if (item.tone === "warning" || item.tone === "danger") {
        toast.warning(`${icon} ${label}`, options)
        playNotificationTone("warning")
      } else {
        toast.info(`${icon} ${label}`, options)
        playNotificationTone("info")
      }
    }

    async function pollFeed() {
      try {
        const response = await fetch('/api/notifications/feed', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) return

        const data = (await response.json()) as NotificationFeedResponse
        const items = data.notifications ?? []

        // First load: seed the seen set so we don't toast the whole backlog.
        if (!initialLoadDone.current) {
          for (const item of items) {
            seenIds.current.add(item.id)
          }
          initialLoadDone.current = true
          pendingCountRef.current = data.pendingCount
          return
        }

        const newItems = items.filter((item) => dedup(item.id))
        for (const item of newItems.slice(0, 3).reverse()) {
          showNotification(item)
        }

        if (pendingCountRef.current !== null && pendingCountRef.current !== data.pendingCount) {
          router.refresh()
        }
        pendingCountRef.current = data.pendingCount
      } catch {
        // Best-effort polling only.
      }
    }

    void pollFeed()
    // 60s fallback — Supabase Broadcast is the primary trigger
    const timer = window.setInterval(() => { void pollFeed() }, 60_000)

    // Immediately re-poll when the tab regains focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void pollFeed()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // Supabase Realtime Broadcast: signal-only (empty payload), triggers re-poll
    let realtimeCleanup: (() => void) | null = null
    const supabase = createClient()
    if (supabase && userId) {
      const channel = supabase.channel(`notifications:${userId}`)
      channel.on("broadcast", { event: "new" }, () => { void pollFeed() })
      channel.subscribe()
      realtimeCleanup = () => { void supabase.removeChannel(channel) }
    }

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
      realtimeCleanup?.()
    }
  }, [userId, role, router])

  return <>{children}</>
}
