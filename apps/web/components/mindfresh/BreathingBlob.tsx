"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// One cycle: 4s inhale + 2s hold + 6s exhale = 12s
const PHASES = [
  { label: "Inhale...", duration: 4 },
  { label: "Hold...", duration: 2 },
  { label: "Exhale...", duration: 6 },
] as const

const CYCLE_DURATION = PHASES.reduce((sum, p) => sum + p.duration, 0) // 12s
const TOTAL_CYCLES = 2 // 24s total

function getPhaseLabel(elapsedInCycle: number): string {
  let acc = 0
  for (const phase of PHASES) {
    acc += phase.duration
    if (elapsedInCycle < acc) return phase.label
  }
  return PHASES[PHASES.length - 1].label
}

export function BreathingBlob({ onDone }: { onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    doneRef.current = false
    setElapsed(0)

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (next >= CYCLE_DURATION * TOTAL_CYCLES && !doneRef.current) {
          doneRef.current = true
          clearInterval(interval)
          setTimeout(onDone, 0)
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onDone])

  const elapsedInCycle = elapsed % CYCLE_DURATION
  const phase = getPhaseLabel(elapsedInCycle)

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-teal-600 dark:text-teal-400"
        >
          {phase}
        </motion.p>
      </AnimatePresence>

      <motion.div
        className="size-28 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 shadow-lg shadow-teal-300/40 dark:shadow-teal-800/40"
        animate={{ scale: [1, 1.25, 1.1, 1] }}
        transition={{
          duration: CYCLE_DURATION,
          times: [0, 4 / 12, 6 / 12, 1],
          repeat: TOTAL_CYCLES - 1,
          ease: "easeInOut",
        }}
      />

      <p className="text-xs text-muted-foreground">
        Round {Math.min(Math.floor(elapsed / CYCLE_DURATION) + 1, TOTAL_CYCLES)} of {TOTAL_CYCLES}
      </p>
    </div>
  )
}
