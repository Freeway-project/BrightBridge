"use client"

import { useEffect, useRef } from "react"

/**
 * Polls a refresh callback at a specified interval when page is visible.
 * Stops polling when tab is hidden to reduce load.
 * Used for keeping dashboard data fresh without real-time subscriptions.
 */
export function useAutoRefresh(
  refreshCallback: () => Promise<void>,
  intervalMs = 10000,
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup()
      } else {
        // Restart polling when page becomes visible
        startPolling()
      }
    }

    // Start polling if page is visible
    const startPolling = () => {
      if (!document.hidden) {
        timerRef.current = setInterval(async () => {
          try {
            await refreshCallback()
          } catch (error) {
            console.error("Auto-refresh failed:", error)
          }
        }, intervalMs)
      }
    }

    // Set up listeners
    document.addEventListener("visibilitychange", handleVisibilityChange)
    startPolling()

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      cleanup()
    }
  }, [refreshCallback, intervalMs])
}
