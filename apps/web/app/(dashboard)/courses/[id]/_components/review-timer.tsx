"use client"

import { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReviewTimerProps = {
  storageKey: string
  onTick?: (elapsed: number) => void
}

export function ReviewTimer({ storageKey, onTick }: ReviewTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)

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
    if (!running) return

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
  }, [onTick, running, storageKey])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const label = [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Review time</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{label}</p>
        </div>
        <Button
          aria-label={running ? "Pause timer" : "Resume timer"}
          onClick={() => setRunning((value) => !value)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}
