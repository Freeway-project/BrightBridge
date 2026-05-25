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
