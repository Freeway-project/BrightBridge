"use client"

import { useEffect, useRef, useState } from "react"
import { AutoUpdateOverlay, UpdateAppliedOverlay } from "./deployment-notification"
import { AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"

interface DeploymentDetectorProps {
  initialVersion: string
}

const CHECK_INTERVAL = 1000 * 60 * 3 // 3 minutes
const UPDATE_APPLIED_FLAG = "coursebridge:update-applied"

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  const pathname = usePathname()
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
    if (pathname.startsWith("/auth") || pathname.startsWith("/maintenance")) {
      return
    }

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

    // Preflight prevents noisy console errors when middleware redirects stream requests.
    let es: EventSource | null = null
    const initStream = async () => {
      try {
        const res = await fetch("/api/version/stream", {
          cache: "no-store",
          redirect: "follow",
        })
        const contentType = (res.headers.get("content-type") ?? "").toLowerCase()
        if (!res.ok || !contentType.includes("text/event-stream")) {
          return
        }

        es = new EventSource("/api/version/stream")

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
          // The server likely just went down for a restart.
          // Browser auto-reconnect handles most cases; keep polling as backup.
          setTimeout(() => void checkVersion(), 4000)
          setTimeout(() => void checkVersion(), 10000)
          setTimeout(() => void checkVersion(), 20000)
        }
      } catch {
        // Ignore stream bootstrap failures.
      }
    }

    void initStream()

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
      if (es) {
        es.close()
      }
      clearInterval(interval)
      window.removeEventListener("error", handleChunkError)
    }
  }, [initialVersion, pathname])

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
