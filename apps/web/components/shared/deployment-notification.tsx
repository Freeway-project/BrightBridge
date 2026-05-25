"use client"

import { motion } from "motion/react"
import { CheckCircle2, RefreshCw } from "lucide-react"

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
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/35"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.24 }}
        onAnimationComplete={onDone}
        className="relative rounded-2xl border border-emerald-400/30 bg-card/95 px-5 py-4 shadow-[0_20px_90px_rgba(16,185,129,0.35)]"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="size-4" />
          <span className="text-sm font-semibold">Updated</span>
        </div>
      </motion.div>
    </div>
  )
}
