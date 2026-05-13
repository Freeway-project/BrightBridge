"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const ALLOWLIST = [
  "akhanum@okanagan.bc.ca",
  "aroy@okanaganbc.ca",
  "amccallum@okanagan.bc.ca",
]

const FORM_KEYS = ["course_metadata", "review_matrix", "syllabus_review"] as const
const FIFTEEN_MIN_MS = 15 * 60 * 1000

const EMOJIS = ["🧠", "☁️", "🌊", "🎯", "✨", "🍃"]
const FALLBACKS = [
  "You're actually doing better than you think. Seriously.",
  "The hard part is behind you. Breathe.",
  "15 seconds. That's all you need right now.",
]

type Props = { userEmail: string; courseId: string }

async function fetchLine(): Promise<string | null> {
  try {
    const res = await fetch("/api/mindfresh/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "funny", mood: null, category: "funny" }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { text?: string }
    return json.text?.trim() ?? null
  } catch {
    return null
  }
}

export function MilestoneReward({ userEmail, courseId }: Props) {
  const isAllowed = ALLOWLIST.includes(userEmail.toLowerCase())
  const [open, setOpen] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emoji] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
  const [fallback] = useState(() => FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)])
  const firedRef = useRef(false)
  const shownKey = `coursebridge:${courseId}:milestone-shown`

  const fire = useCallback(async () => {
    if (firedRef.current) return
    if (localStorage.getItem(shownKey)) return
    firedRef.current = true
    localStorage.setItem(shownKey, "1")

    // Open immediately — text loads in after
    setOpen(true)
    setIsLoading(true)
    const text = await fetchLine()
    setAiText(text)
    setIsLoading(false)
  }, [shownKey])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setAiText(null)
    const text = await fetchLine()
    setAiText(text)
    setIsLoading(false)
  }, [])

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
    if (allFormsDone()) { void fire(); return }
    const iv = setInterval(() => {
      if (allFormsDone()) {
        void fire()
        clearInterval(iv)
      }
    }, 4000)
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
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl text-center"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">{emoji}</div>
            <h2 className="text-lg font-bold mb-3 text-foreground">Take 15 seconds.</h2>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.p
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground animate-pulse min-h-[40px] flex items-center justify-center mb-6"
                >
                  Getting a fresh thought…
                </motion.p>
              ) : (
                <motion.p
                  key={aiText ?? "fallback"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-muted-foreground leading-relaxed min-h-[40px] mb-6"
                >
                  {aiText ?? fallback}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white border-0"
                onClick={() => setOpen(false)}
              >
                Back to it
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                disabled={isLoading}
                onClick={() => void refresh()}
              >
                <RefreshCw className="size-3" />
                {isLoading ? "Loading…" : "Try another"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
