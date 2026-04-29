"use client"

import { useEffect, useState } from "react"
import { Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ReviewTimerProps = {
  storageKey: string
  label?: string
  onTick?: (elapsed: number) => void
}

export function ReviewTimer({ storageKey, label = "Review time", onTick }: ReviewTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

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
    if (isPaused) return

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
  }, [onTick, storageKey, isPaused])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const displayTime = [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {label}
          </p>
          <div className={cn(
            "size-2 rounded-full animate-pulse",
            isPaused ? "bg-orange-500" : "bg-primary"
          )} />
        </div>
        
        <div className="flex items-baseline gap-1">
          <p className="font-mono text-3xl font-bold tabular-nums text-foreground tracking-tighter">
            {displayTime}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            {isPaused ? "Paused" : "Running"}
          </p>
        </div>

        <Button 
          variant={isPaused ? "default" : "outline"} 
          size="sm" 
          className="w-full h-8 text-xs font-bold gap-2"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? (
            <>
              <Play className="size-3 fill-current" />
              Resume Timer
            </>
          ) : (
            <>
              <Pause className="size-3 fill-current" />
              Pause Review
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
