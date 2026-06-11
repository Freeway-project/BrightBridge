"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { playThematicReward } from "@/components/mindfresh/RewardEffects"
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti"

const CELEBRATION_EMOJIS = ["🎉", "🚀", "🔥", "⚡", "🏆", "💥", "✨", "🎯"]
const AUTO_DISMISS_MS = 4000

type Props = {
  open: boolean
  context: string  // e.g. "TA submitted a course review"
  onDone?: () => void
}

export function CelebrationOverlay({ open, context, onDone }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [emoji] = useState(() => CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)])

  useEffect(() => {
    if (!open) { setMessage(null); return }

    // Fire effects immediately
    playUpgradeConfetti({ durationMs: 3000 })
    setTimeout(() => playThematicReward("random"), 400)

    // Fetch funny AI message
    fetch("/api/mindfresh/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ celebrationContext: context }),
    })
      .then((r) => r.json())
      .then((j: { text?: string }) => { if (j.text) setMessage(j.text.trim()) })
      .catch(() => {})

    // Auto-dismiss
    const t = setTimeout(() => onDone?.(), AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [open, context, onDone])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onDone}
        >
          {/* blurred backdrop */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
            className="relative mx-4 flex flex-col items-center gap-5 rounded-3xl border border-border/40 bg-background/95 px-10 py-10 shadow-2xl text-center max-w-sm w-full"
          >
            {/* big emoji */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 10 }}
              transition={{ type: "spring", damping: 10, stiffness: 220, delay: 0.05 }}
              className="text-7xl select-none"
            >
              {emoji}
            </motion.div>

            {/* message */}
            <div className="space-y-1.5">
              <p className="text-xl font-black tracking-tight">You actually did it.</p>
              {message ? (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-muted-foreground font-medium leading-relaxed"
                >
                  {message}
                </motion.p>
              ) : (
                <p className="text-sm text-muted-foreground animate-pulse">one sec…</p>
              )}
            </div>

            {/* tap to dismiss hint */}
            <p className="text-[11px] text-muted-foreground/50 mt-1">tap anywhere to continue</p>

            {/* auto-dismiss progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
