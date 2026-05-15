"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function OneTimeThoughtModal() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      toast("Good morning", {
        description:
          "I know change is not always easy, but remember—beautiful things also grow in uncomfortable seasons. Wishing you a peaceful and fresh start today.",
        duration: 10_000,
      })
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}
