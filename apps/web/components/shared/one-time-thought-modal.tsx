"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const STORAGE_KEY = "cb_seen_thought_modal_v3"

export function OneTimeThoughtModal() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return
      window.localStorage.setItem(STORAGE_KEY, "true")
      toast("Good morning", {
        description:
          "I know change is not always easy, but remember—beautiful things also grow in uncomfortable seasons. Wishing you a peaceful and fresh start today.",
        duration: 10_000,
      })
    } catch {
      return
    }
  }, [])

  return null
}
