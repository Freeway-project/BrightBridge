"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

export function BubblePopGame({ onDone }: { onDone: () => void }) {
  const [popped, setPopped] = useState<number[]>([])
  const total = 6

  const bubbles = useMemo(() => Array.from({ length: total }, (_, i) => i), [])

  const handlePop = (index: number) => {
    if (popped.includes(index)) {
      return
    }
    const next = [...popped, index]
    setPopped(next)
    if (next.length === total) {
      onDone()
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Pop all bubbles to reset your focus.</p>
      <div className="grid grid-cols-3 gap-2">
        {bubbles.map((bubble) => {
          const isPopped = popped.includes(bubble)
          return (
            <Button
              key={bubble}
              type="button"
              size="icon-lg"
              variant={isPopped ? "secondary" : "outline"}
              className="rounded-full"
              onClick={() => handlePop(bubble)}
              disabled={isPopped}
            >
              {isPopped ? "✓" : "●"}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
