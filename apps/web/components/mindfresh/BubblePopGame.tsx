"use client"

import { useMemo, useState, type MouseEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playPopEffect } from "./RewardEffects"

const BUBBLE_COLORS = [
  "from-cyan-400 to-sky-500",
  "from-teal-400 to-emerald-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-pink-400 to-rose-500",
  "from-lime-400 to-green-500",
]

const BUBBLE_SIZES = ["size-14", "size-16", "size-12"]

export function BubblePopGame({ onDone }: { onDone: () => void }) {
  const [popped, setPopped] = useState<number[]>([])
  const total = 6

  const bubbles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => ({
        id: i,
        color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
        size: BUBBLE_SIZES[i % BUBBLE_SIZES.length],
      })),
    []
  )

  const handlePop = (id: number, e: MouseEvent) => {
    if (popped.includes(id)) return
    
    // Play the pop effect at the click coordinates
    playPopEffect(e.clientX, e.clientY)

    const next = [...popped, id]
    setPopped(next)
    if (next.length === total) {
      setTimeout(onDone, 400)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Pop all bubbles to reset your focus.</p>
      <div className="grid grid-cols-3 place-items-center gap-3">
        <AnimatePresence>
          {bubbles.map((bubble) => {
            const isPopped = popped.includes(bubble.id)
            return (
              <motion.button
                key={bubble.id}
                type="button"
                className={`${bubble.size} ${bubble.color} rounded-full bg-gradient-to-br shadow-md cursor-pointer select-none flex items-center justify-center`}
                animate={isPopped ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                whileHover={isPopped ? {} : { scale: 1.15 }}
                whileTap={isPopped ? {} : { scale: 0.9 }}
                transition={{ type: "spring", damping: 14, stiffness: 200 }}
                onClick={(e) => handlePop(bubble.id, e)}
                disabled={isPopped}
              >
                {!isPopped && (
                  <span className="size-3 rounded-full bg-white/40 block translate-x-1 -translate-y-1" />
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {popped.length} / {total} popped
      </p>
    </div>
  )
}
