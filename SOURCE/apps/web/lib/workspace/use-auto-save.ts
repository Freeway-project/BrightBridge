"use client"

import { useEffect, useRef } from "react"
import { useWatch, type Control, type FieldValues } from "react-hook-form"

/**
 * Watches all form values and calls `save` 1.5 s after the user stops
 * making changes. Skips the initial mount so server-loaded defaults don't
 * trigger a redundant save.
 */
export function useAutoSave<T extends FieldValues>(
  control: Control<T>,
  save: () => void,
  debounceMs = 1500,
) {
  const values = useWatch({ control })
  const saveRef = useRef(save)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMountedRef = useRef(false)

  // Keep the callback fresh without adding it to effect deps
  saveRef.current = save

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveRef.current(), debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [values, debounceMs])
}
