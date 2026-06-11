"use client"

import { useEffect, useState } from "react"

/**
 * Remembers the active tab across remounts/navigation by persisting it to
 * localStorage under a stable key. Returns a [value, setValue] pair to wire
 * into a controlled `<Tabs value onValueChange>`.
 *
 * SSR-safe: starts from `defaultValue` (matching the server render) and only
 * adopts the stored value after mount, so there is no hydration mismatch.
 */
export function useStickyTabState(storageKey: string, defaultValue: string) {
  const key = `coursebridge:tab:${storageKey}`
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) setValue(stored)
    } catch {
      // localStorage unavailable (private mode / SSR) — fall back to default.
    }
  }, [key])

  const set = (next: string) => {
    setValue(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      // ignore persistence failures
    }
  }

  return [value, set] as const
}
