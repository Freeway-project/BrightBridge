"use client"

import { motion } from "motion/react"
import { RefreshCw } from "lucide-react"

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
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120]">
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: ["-100%", "0%", "0%", "-100%"] }}
        transition={{
          duration: 4.2,
          times: [0, 0.18, 0.82, 1],
          ease: ["easeOut", "linear", "easeIn", "easeIn"],
        }}
        onAnimationComplete={onDone}
        className="relative flex items-center justify-center gap-5 overflow-hidden bg-black/90 px-8 py-4 backdrop-blur-xl"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* subtle gradient shimmer */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="relative shrink-0 text-white/80"
        >
          <RefreshCw className="size-4" />
        </motion.div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold tracking-wide text-white">Updating…</span>
          <span className="text-[11px] italic text-white/50">"Change is the only constant"</span>
        </div>
      </motion.div>
    </div>
  )
}

export function UpdateAppliedOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/28"
      />

      <motion.div
        initial={{ y: "-20%" }}
        animate={{ y: "110%" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onAnimationComplete={onDone}
        className="absolute inset-x-0 h-28"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-200/80 to-transparent shadow-[0_0_80px_25px_rgba(125,211,252,0.55)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-cyan-200/60 bg-black/35 px-4 py-1 text-xs font-semibold tracking-[0.14em] text-cyan-100">
            UPDATING...
          </span>
        </div>
      </motion.div>
    </div>
  )
}
