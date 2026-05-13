"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

const ALLOWLIST = [
  "akhanum@okanagan.bc.ca",
  "aroy@okanaganbc.ca",
  "amccallum@okanagan.bc.ca",
]

const FORM_KEYS = ["course_metadata", "review_matrix", "syllabus_review"] as const
const FIFTEEN_MIN_MS = 15 * 60 * 1000

type Props = { userEmail: string; courseId: string }

export function MilestoneReward({ userEmail, courseId }: Props) {
  const isAllowed = ALLOWLIST.includes(userEmail.toLowerCase())
  const [open, setOpen] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const firedRef = useRef(false)

  const shownKey = `coursebridge:${courseId}:milestone-shown`

  const fire = useCallback(async () => {
    if (firedRef.current) return
    if (localStorage.getItem(shownKey)) return
    firedRef.current = true
    localStorage.setItem(shownKey, "1")

    try {
      const res = await fetch("/api/mindfresh/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "funny", mood: null, category: "funny" }),
      })
      if (res.ok) {
        const json = (await res.json()) as { text?: string }
        setAiText(json.text?.trim() ?? null)
      }
    } catch {
      // show fallback text
    }

    setOpen(true)
  }, [shownKey])

  const allFormsDone = useCallback(() => {
    return FORM_KEYS.every(
      (key) => localStorage.getItem(`coursebridge:${courseId}:form-done:${key}`) === "1"
    )
  }, [courseId])

  // 15-minute timer
  useEffect(() => {
    if (!isAllowed) return
    const t = setTimeout(() => void fire(), FIFTEEN_MIN_MS)
    return () => clearTimeout(t)
  }, [isAllowed, fire])

  // Poll for all 3 forms done (every 4s)
  useEffect(() => {
    if (!isAllowed) return
    const iv = setInterval(() => {
      if (allFormsDone()) {
        void fire()
        clearInterval(iv)
      }
    }, 4000)
    // also check immediately on mount
    if (allFormsDone()) void fire()
    return () => clearInterval(iv)
  }, [isAllowed, allFormsDone, fire])

  if (!isAllowed) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="relative mx-4 max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl text-center"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-lg font-bold mb-2 text-foreground">Take 15 seconds.</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {aiText ?? "You're actually doing better than you think. Seriously."}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white border-0"
              onClick={() => setOpen(false)}
            >
              Back to it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
