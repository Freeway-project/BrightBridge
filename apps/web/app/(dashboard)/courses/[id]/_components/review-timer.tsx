"use client"

import { useEffect, useState } from "react"
import { Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"

export const REVIEW_TIMER_EVENT = "coursebridge:review-timer"

type ReviewTimerProps = {
  storageKey: string
  label?: string
  onTick?: (elapsed: number) => void
  compact?: boolean
}

export function ReviewTimer({
  storageKey,
  label = "Review time",
  onTick,
  compact = false,
}: ReviewTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (Number.isFinite(parsed)) {
        setElapsed(parsed)
        onTick?.(parsed)
      }
    }
  }, [onTick, storageKey])

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed((current) => {
        const next = current + 1
        window.localStorage.setItem(storageKey, String(next))
        window.dispatchEvent(
          new CustomEvent(REVIEW_TIMER_EVENT, {
            detail: { storageKey, elapsed: next },
          }),
        )
        onTick?.(next)
        return next
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [onTick, storageKey])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const displayTime = [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")

  if (compact) {
    return (
      <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <Clock3 className="size-3.5 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {label}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {displayTime}
            </p>
          </div>
          <div className="ml-auto size-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {label}
          </p>
          <div className={cn("size-2 rounded-full animate-pulse bg-primary")} />
        </div>

        <div className="flex items-baseline gap-1">
          <p className="font-mono text-3xl font-bold tabular-nums text-foreground tracking-tighter">
            {displayTime}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            Running
          </p>
        </div>
      </div>
    </div>
  )
}

export function useStoredTimerValue(storageKey: string, initialValue = 0) {
  const [elapsed, setElapsed] = useState(initialValue)

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (Number.isFinite(parsed)) {
        setElapsed(parsed)
        return
      }
    }

    setElapsed(initialValue)
  }, [initialValue, storageKey])

  useEffect(() => {
    function onTick(event: Event) {
      const detail = (event as CustomEvent<{ storageKey: string; elapsed: number }>).detail
      if (detail.storageKey === storageKey) {
        setElapsed(detail.elapsed)
      }
    }

    window.addEventListener(REVIEW_TIMER_EVENT, onTick)
    return () => window.removeEventListener(REVIEW_TIMER_EVENT, onTick)
  }, [storageKey])

  return elapsed
}
