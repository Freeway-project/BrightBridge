"use client"

import { useEffect, useRef, useState } from "react"
import { AutoUpdateOverlay, UpdateAppliedOverlay } from "./deployment-notification"
import { AnimatePresence } from "motion/react"

interface DeploymentDetectorProps {
  initialVersion: string
}

const CHECK_INTERVAL = 1000 * 60 * 3 // 3 minutes
const UPDATE_APPLIED_FLAG = "coursebridge:update-applied"

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  const [showAutoUpdate, setShowAutoUpdate] = useState(false)
  const [showUpdatedOverlay, setShowUpdatedOverlay] = useState(false)
  const updatePending = useRef(false)

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

      // Only trigger the bubble animation if the user is actively watching the tab
      if (document.visibilityState === "visible") {
        setShowAutoUpdate(true)
      } else {
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            setShowAutoUpdate(true)
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

    // SSE Stream for immediate notification
    const es = new EventSource("/api/version/stream")
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          triggerUpdate()
          es.close()
        }
      } catch {
        // Ignore malformed frames
      }
    }
    es.onerror = () => {
      es.close()
      void checkVersion()
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
    ;(window as any).__triggerUpdate = triggerUpdate;

    return () => {
      es.close()
      clearInterval(interval)
      window.removeEventListener("error", handleChunkError)
    }
  }, [initialVersion])

  return (
    <>
      <AnimatePresence>
        {showAutoUpdate && (
          <AutoUpdateOverlay
            onDone={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(UPDATE_APPLIED_FLAG, "1")
              }
              window.location.reload()
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpdatedOverlay && (
          <UpdateAppliedOverlay
            onDone={() => {
              setShowUpdatedOverlay(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
