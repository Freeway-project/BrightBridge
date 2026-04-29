"use client"

import { useEffect, useState } from "react"

type ReviewTimerProps = {
  storageKey: string
  label?: string
  onTick?: (elapsed: number) => void
}

export function ReviewTimer({ storageKey, label = "Review time", onTick }: ReviewTimerProps) {
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
          new CustomEvent("coursebridge:review-timer", {
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

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="space-y-1.5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{displayTime}</p>
        </div>
      </div>
    </div>
  )
}
