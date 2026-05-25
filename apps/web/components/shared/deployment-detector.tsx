"use client"

import { useEffect, useRef, useState } from "react"
import { hasUnsavedChanges } from "@/lib/deployment-sync"
import {
  AutoUpdateOverlay,
  DeploymentNotification,
  MinimizedUpdatePill,
  UpdateAppliedOverlay,
} from "./deployment-notification"
import { WhatsNewModal } from "./whats-new-modal"
import { AnimatePresence } from "motion/react"

interface DeploymentDetectorProps {
  initialVersion: string
}

const CHECK_INTERVAL = 1000 * 60 * 3 // 3 minutes
const UPDATE_APPLIED_FLAG = "coursebridge:update-applied"

export function DeploymentDetector({ initialVersion }: DeploymentDetectorProps) {
  const [showNotification, setShowNotification] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showUpdatedOverlay, setShowUpdatedOverlay] = useState(false)
  const [showAutoUpdate, setShowAutoUpdate] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const hasNotified = useRef(false)
  const hasChunkWarning = useRef(false)

  const triggerUpdateDetected = () => {
    if (hasNotified.current) return
    hasNotified.current = true
    if (hasUnsavedChanges()) {
      setShowNotification(true)
    } else {
      setShowAutoUpdate(true)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(UPDATE_APPLIED_FLAG) === "1") {
      window.sessionStorage.removeItem(UPDATE_APPLIED_FLAG)
      setShowUpdatedOverlay(true)
      const timeout = window.setTimeout(() => setShowUpdatedOverlay(false), 1200)
      return () => window.clearTimeout(timeout)
    }

    if (initialVersion === "development" || initialVersion === "dev") return

    const checkVersion = async () => {
      if (hasNotified.current) return

      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        if (!res.ok) return

        const data = await res.json()
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          triggerUpdateDetected()
        }
      } catch {
        // Ignore connectivity/version errors.
      }
    }

    const es = new EventSource("/api/version/stream")

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.version && data.version !== initialVersion && data.version !== "development") {
          triggerUpdateDetected()
          es.close()
        }
      } catch {
        // Ignore malformed SSE frames.
      }
    }

    es.onerror = () => {
      es.close()
      void checkVersion()
    }

    const interval = setInterval(() => void checkVersion(), CHECK_INTERVAL)

    const handleChunkError = (e: ErrorEvent) => {
      if (
        e.message?.includes("Loading chunk") ||
        e.message?.includes("CSS chunk") ||
        e.message?.includes("SyntaxError: Unexpected token '<'")
      ) {
        if (!hasUnsavedChanges()) {
          window.location.reload()
          return
        }

        if (hasChunkWarning.current) return
        hasChunkWarning.current = true

        const id = "chunk-refresh-warning"
        window.dispatchEvent(new CustomEvent("coursebridge:chunk-warning", { detail: { id } }))
      }
    }

    window.addEventListener("error", handleChunkError)
    const openUpdatePanel = () => {
      setIsMinimized(false)
      setShowNotification(true)
    }
    window.addEventListener("coursebridge:open-update-notice", openUpdatePanel)

    return () => {
      es.close()
      clearInterval(interval)
      window.removeEventListener("error", handleChunkError)
      window.removeEventListener("coursebridge:open-update-notice", openUpdatePanel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVersion])

  useEffect(() => {
    const handler = () => {
      if (!hasUnsavedChanges()) {
        window.location.reload()
        return
      }
      const actionBar = document.createElement("div")
      actionBar.className =
        "fixed bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-xl"
      actionBar.innerHTML = "Update ready. Save your draft, then refresh."
      const btn = document.createElement("button")
      btn.className =
        "ml-2 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
      btn.textContent = "Refresh"
      btn.onclick = () => window.location.reload()
      actionBar.appendChild(btn)
      document.body.appendChild(actionBar)
      window.setTimeout(() => actionBar.remove(), 6000)
    }

    window.addEventListener("coursebridge:chunk-warning", handler)
    return () => window.removeEventListener("coursebridge:chunk-warning", handler)
  }, [])

  return (
    <>
      <AnimatePresence>
        {showNotification && (
          <DeploymentNotification
            onRefresh={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(UPDATE_APPLIED_FLAG, "1")
              }
              window.location.reload()
            }}
            onDismiss={() => {
              setShowNotification(false)
              setIsMinimized(true)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && (
          <MinimizedUpdatePill
            onClick={() => {
              setIsMinimized(false)
              setShowNotification(true)
            }}
          />
        )}
      </AnimatePresence>

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
              // Show What's New once per browser session
              const SEEN_KEY = "coursebridge:whats-new-seen"
              if (typeof window !== "undefined" && !window.sessionStorage.getItem(SEEN_KEY)) {
                window.sessionStorage.setItem(SEEN_KEY, "1")
                setShowWhatsNew(true)
              }
            }}
          />
        )}
      </AnimatePresence>

      <WhatsNewModal
        open={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />
    </>
  )
}
