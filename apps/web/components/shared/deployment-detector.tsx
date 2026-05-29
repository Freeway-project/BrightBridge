"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AutoUpdateOverlay,
  UpdateAppliedOverlay,
  UpdateAvailablePill,
} from "./deployment-notification"
import { AnimatePresence } from "motion/react"
import { SthitaprajnaModal } from "./sthitaprajna-modal"

interface DeploymentDetectorProps {
  initialVersion: string
}

const CHECK_INTERVAL = 1000 * 60 * 3 // 3 minutes
const UPDATE_APPLIED_FLAG = "coursebridge:update-applied"

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  // A new build is available. Drives the persistent Refresh pill.
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false)
  // Brief, non-blocking meteor burst played once when the update is detected.
  const [showMeteorBurst, setShowMeteorBurst] = useState(false)
  // Post-reload celebratory meteors, shown after the user refreshed.
  const [showUpdatedOverlay, setShowUpdatedOverlay] = useState(false)
  const [showSthitaprajna, setShowSthitaprajna] = useState(false)
  const updatePending = useRef(false)

  // Reload is user-initiated only — triggered from the pill's Refresh button.
  const applyUpdate = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(UPDATE_APPLIED_FLAG, "1")
    }
    window.location.reload()
  }, [])

  // 1. Check if we just refreshed after an update
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(UPDATE_APPLIED_FLAG) === "1") {
      window.sessionStorage.removeItem(UPDATE_APPLIED_FLAG)
      setShowUpdatedOverlay(true)
    }
  }, [])

  // 2. Listen for version changes
  useEffect(() => {
    if (initialVersion === "development" || initialVersion === "dev") return

    const triggerUpdate = () => {
      if (updatePending.current) return
      updatePending.current = true

      const reveal = () => {
        setShowUpdateAvailable(true)
        setShowMeteorBurst(true)
      }

      // Only reveal while the user is actively watching the tab.
      if (document.visibilityState === "visible") {
        reveal()
      } else {
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            reveal()
            document.removeEventListener("visibilitychange", onVisible)
          }
        }
        document.addEventListener("visibilitychange", onVisible)
      }
    }

    // Polling fallback
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          triggerUpdate()
        }
      } catch {
        // Ignore connectivity errors
      }
    }

    // Use a robust reconnecting SSE or aggressive fallback when disconnected
    let es: EventSource | null = new EventSource("/api/version/stream")

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          triggerUpdate()
          if (es) {
            es.close()
            es = null
          }
        }
      } catch {
        // Ignore malformed frames
      }
    }

    es.onerror = () => {
      // The server likely just went down for a PM2 restart.
      // We do NOT close the EventSource, so the browser will auto-reconnect!
      // But we also manually check a few times while it's restarting to be safe.
      setTimeout(() => void checkVersion(), 4000)
      setTimeout(() => void checkVersion(), 10000)
      setTimeout(() => void checkVersion(), 20000)
    }

    const interval = setInterval(() => void checkVersion(), CHECK_INTERVAL)

    // Intercept chunk errors (which happen if user navigates after a deployment)
    const handleChunkError = (e: ErrorEvent) => {
      if (
        e.message?.includes("Loading chunk") ||
        e.message?.includes("CSS chunk") ||
        e.message?.includes("SyntaxError: Unexpected token '<'")
      ) {
        triggerUpdate()
      }
    }
    window.addEventListener("error", handleChunkError)

    // For local testing: run `window.__triggerUpdate()` in the browser console
    ;(window as any).__triggerUpdate = triggerUpdate

    return () => {
      if (es) {
        es.close()
      }
      clearInterval(interval)
      window.removeEventListener("error", handleChunkError)
    }
  }, [initialVersion])

  return (
    <>
      {/* Non-blocking meteor burst (plays once, then self-removes) */}
      <AnimatePresence>
        {showMeteorBurst && <AutoUpdateOverlay onDone={() => setShowMeteorBurst(false)} />}
      </AnimatePresence>

      {/* Persistent, dismissible Refresh pill — the only interactive piece */}
      <AnimatePresence>
        {showUpdateAvailable && (
          <UpdateAvailablePill
            onRefresh={applyUpdate}
            onDismiss={() => setShowUpdateAvailable(false)}
          />
        )}
      </AnimatePresence>

      {/* Post-reload celebratory meteors → Sthitaprajna */}
      <AnimatePresence>
        {showUpdatedOverlay && (
          <UpdateAppliedOverlay
            onDone={() => {
              setShowUpdatedOverlay(false)
              setTimeout(() => setShowSthitaprajna(true), 300)
            }}
          />
        )}
      </AnimatePresence>

      <SthitaprajnaModal isOpen={showSthitaprajna} onClose={() => setShowSthitaprajna(false)} />
    </>
  )
}
