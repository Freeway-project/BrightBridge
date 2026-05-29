"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { RefreshCw, X } from "lucide-react"
import { Meteors } from "@/components/ui/meteors"

const AUTO_UPDATE_COLORS = [
  "#818cf8", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#38bdf8", // sky
  "#a78bfa", // purple
  "#34d399", // emerald
  "#fb7185", // rose
]

const UPDATE_APPLIED_COLORS = [
  "#34d399", // emerald
  "#6ee7b7", // light emerald
  "#38bdf8", // sky
  "#a3e635", // lime
]

/**
 * Colorful, non-blocking meteor burst shown when a new build is detected.
 * pointer-events-none + no backdrop, so the user can keep working. It plays
 * briefly then calls onDone to stop rendering; it never reloads — the reload is
 * user-initiated from UpdateAvailablePill.
 */
export function AutoUpdateOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <Meteors number={30} colors={AUTO_UPDATE_COLORS} />
    </div>
  )
}

/**
 * Post-reload celebratory meteors (non-blocking). Only sequences the follow-up
 * modal via onDone — no reload here.
 */
export function UpdateAppliedOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none fixed inset-0 z-[110] overflow-hidden"
    >
      <Meteors number={26} colors={UPDATE_APPLIED_COLORS} />
    </motion.div>
  )
}

/**
 * Colorful, dismissible "Update available" pill (bottom-right). This is the only
 * interactive piece — clicking Refresh reloads, the × dismisses. Non-blocking:
 * it floats above the UI without locking it.
 */
export function UpdateAvailablePill({
  onRefresh,
  onDismiss,
}: {
  onRefresh: () => void
  onDismiss: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="pointer-events-auto fixed bottom-5 right-5 z-[130]"
    >
      <div className="relative overflow-hidden rounded-full p-[1.5px] shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        {/* Colorful gradient ring */}
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#818cf8,#ec4899,#f59e0b,#34d399,#38bdf8,#818cf8)]" />
        <div className="relative flex items-center gap-2 rounded-full bg-card/95 px-2 py-1.5 backdrop-blur">
          <span className="ml-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <RefreshCw className="size-3.5 text-primary" />
            Update available
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Refresh
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
