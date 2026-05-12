"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Bump this suffix to re-show the modal for a future message revision.
const STORAGE_KEY = "cb_seen_thought_modal_v1"
const DISPLAY_DURATION_MS = 10_000
const TITLE_ID = "one-time-thought-modal-title"
const DESCRIPTION_ID = "one-time-thought-modal-description"

export function OneTimeThoughtModal() {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const dismissModal = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setIsVisible(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    try {
      const hasSeen = window.localStorage.getItem(STORAGE_KEY)
      if (hasSeen) return

      setIsVisible(true)

      timerRef.current = window.setTimeout(() => {
        dismissModal()
      }, DISPLAY_DURATION_MS)

      return () => {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    } catch {
      return
    }
  }, [dismissModal])

  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissModal()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={DESCRIPTION_ID}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-primary/30 bg-card/95 p-8 text-center text-card-foreground shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-indigo-300/10" />
        <p className="relative text-xs tracking-[0.2em] text-primary/85 uppercase">
          Gentle Reminder
        </p>
        <h2 id={TITLE_ID} className="relative mt-4 text-xl leading-relaxed font-semibold md:text-2xl">
          “Almost everything will work again if you unplug it for a few minutes… Including you.”
        </h2>
        <p id={DESCRIPTION_ID} className="relative mt-4 text-sm text-muted-foreground">
          Breathe. Reset. Then build something beautiful.
        </p>
      </div>
    </div>
  )
}
