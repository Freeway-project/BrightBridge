"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { RefreshCw } from "lucide-react"
import { AnimatedBubbleParticles } from "@/components/ui/animated-bubble-particles"

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

interface DeploymentNotificationProps {
  onRefresh: () => void
  onDismiss: () => void
}

export function DeploymentNotification({ onRefresh, onDismiss }: DeploymentNotificationProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-auto relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/15 p-2 text-primary">
            <RefreshCw className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Update available</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A newer build is available on this server. Refresh when ready to load it.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Refresh now
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function MinimizedUpdatePill({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      className="fixed bottom-5 right-5 z-[90] rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg"
    >
      Update available
    </motion.button>
  )
}

export function AutoUpdateOverlay({ onDone }: { onDone: () => void }) {
  const [colorIndex, setColorIndex] = useState(0)
  const [dots, setDots] = useState(".")
  const colorTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    colorTimer.current = setInterval(() => {
      setColorIndex((i) => (i + 1) % AUTO_UPDATE_COLORS.length)
    }, 800)
    dotsTimer.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."))
    }, 400)

    // Auto-dismiss after 5 s then call onDone to trigger reload
    const dismiss = window.setTimeout(onDone, 5000)

    return () => {
      if (colorTimer.current) clearInterval(colorTimer.current)
      if (dotsTimer.current) clearInterval(dotsTimer.current)
      window.clearTimeout(dismiss)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <AnimatedBubbleParticles
        particleColor={AUTO_UPDATE_COLORS[colorIndex]}
        particleSize={34}
        spawnInterval={150}
        blurStrength={13}
        enableGooEffect
        width="100vw"
        height="100vh"
        className="bg-black/75 backdrop-blur-sm"
        zIndex={120}
      >
        <div className="flex flex-col items-center gap-4 select-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            style={{ color: AUTO_UPDATE_COLORS[colorIndex], transition: "color 0.8s ease" }}
          >
            <RefreshCw className="size-7" />
          </motion.div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-bold tracking-tight text-white">
              Updating{dots}
            </span>
            <span className="text-xs italic text-white/45">"Change is the only constant"</span>
          </div>
        </div>
      </AnimatedBubbleParticles>
    </div>
  )
}

export function UpdateAppliedOverlay({ onDone }: { onDone: () => void }) {
  const [colorIndex, setColorIndex] = useState(0)
  const colorTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    colorTimer.current = setInterval(() => {
      setColorIndex((i) => (i + 1) % UPDATE_APPLIED_COLORS.length)
    }, 600)
    return () => {
      if (colorTimer.current) clearInterval(colorTimer.current)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[110]">
      <AnimatedBubbleParticles
        particleColor={UPDATE_APPLIED_COLORS[colorIndex]}
        particleSize={28}
        spawnInterval={120}
        blurStrength={11}
        enableGooEffect
        width="100vw"
        height="100vh"
        className="bg-black/60 backdrop-blur-sm"
        zIndex={110}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onAnimationComplete={onDone}
          className="flex flex-col items-center gap-3 select-none"
        >
          <span
            className="rounded-full px-5 py-2 text-sm font-bold tracking-widest text-white uppercase"
            style={{
              background: UPDATE_APPLIED_COLORS[colorIndex],
              boxShadow: `0 0 30px ${UPDATE_APPLIED_COLORS[colorIndex]}88`,
              transition: "background 0.6s ease, box-shadow 0.6s ease",
            }}
          >
            ✓ Updated
          </span>
          <span className="text-xs text-white/50">Running the latest build</span>
        </motion.div>
      </AnimatedBubbleParticles>
    </div>
  )
}
