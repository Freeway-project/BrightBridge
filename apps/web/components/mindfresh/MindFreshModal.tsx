"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MoodCheckIn } from "@/components/mindfresh/MoodCheckIn"
import { QuoteCard } from "@/components/mindfresh/QuoteCard"
import { BreathingBlob } from "@/components/mindfresh/BreathingBlob"
import { BubblePopGame } from "@/components/mindfresh/BubblePopGame"
import { CompletionCard } from "@/components/mindfresh/CompletionCard"
import { CountdownRing } from "@/components/mindfresh/CountdownRing"
import { pickMindFreshItem } from "@/components/mindfresh/mindfresh-data"
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti"
import { playThematicReward } from "@/components/mindfresh/RewardEffects"
import { StickerPlop } from "@/components/mindfresh/StickerPlop"
import type { CheckInMood, MindFreshMode } from "@/components/mindfresh/types"

type MindFreshModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODES: {
  value: MindFreshMode
  emoji: string
  label: string
  sub: string
  gradient: string
  activeText: string
}[] = [
  {
    value: "calm",
    emoji: "🌊",
    label: "Calm",
    sub: "Breathe & reflect",
    gradient: "from-cyan-500/20 to-teal-500/20 border-teal-400/40",
    activeText: "text-teal-700 dark:text-teal-300",
  },
  {
    value: "funny",
    emoji: "😄",
    label: "Funny",
    sub: "Laugh it off",
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-400/40",
    activeText: "text-amber-700 dark:text-amber-300",
  },
  {
    value: "focus",
    emoji: "🎯",
    label: "Focus",
    sub: "Quick prompt",
    gradient: "from-violet-500/20 to-purple-500/20 border-violet-400/40",
    activeText: "text-violet-700 dark:text-violet-300",
  },
  {
    value: "random",
    emoji: "🎲",
    label: "Random",
    sub: "Surprise me",
    gradient: "from-pink-500/20 to-rose-500/20 border-pink-400/40",
    activeText: "text-pink-700 dark:text-pink-300",
  },
]

const MOOD_TO_MODE: Record<CheckInMood, MindFreshMode> = {
  overwhelmed: "calm",
  neutral:     "funny",
  good:        "focus",
  energized:   "random",
}

export function MindFreshModal({ open, onOpenChange }: MindFreshModalProps) {
  const [mode, setMode] = useState<MindFreshMode>("random")
  const [mood, setMood] = useState<CheckInMood | null>(null)
  const [completed, setCompleted] = useState(false)
  const [modeManuallySet, setModeManuallySet] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  // increments on every "try another" to force a new item even if mode doesn't change
  const [pickCount, setPickCount] = useState(0)
  const activityKey = useRef(0)

  const item = useMemo(() => {
    activityKey.current += 1
    return pickMindFreshItem(mode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, pickCount])

  const isAiCategory = item.type === "quote" || item.type === "funny" || item.type === "prompt"
  const displayItem = aiText ? { ...item, text: aiText } : item

  useEffect(() => {
    async function generateAiText() {
      if (!open || !isAiCategory) {
        setAiText(null)
        setIsLoadingAi(false)
        return
      }
      setIsLoadingAi(true)
      try {
        const response = await fetch("/api/mindfresh/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, mood, category: item.type }),
        })
        if (!response.ok) { setAiText(null); return }
        const json = (await response.json()) as { text?: string }
        setAiText(json.text?.trim() || null)
      } catch {
        setAiText(null)
      } finally {
        setIsLoadingAi(false)
      }
    }
    void generateAiText()
  }, [open, mode, mood, item.type, isAiCategory])

  const complete = () => {
    setCompleted(true)
    playUpgradeConfetti({ durationMs: 1200 })
    playThematicReward(mode)
  }

  const reset = () => {
    setCompleted(false)
    setMood(null)
    setMode("random")
    setModeManuallySet(false)
    setAiText(null)
    setIsLoadingAi(false)
    setPickCount((c) => c + 1)
  }

  const handleMoodChange = (next: CheckInMood) => {
    setMood(next)
    if (!modeManuallySet) {
      setMode(MOOD_TO_MODE[next])
    }
  }

  const handleModeChange = (next: MindFreshMode) => {
    setCompleted(false)
    setAiText(null)
    setMode(next)
    setModeManuallySet(true)
  }

  const activeMode = MODES.find((m) => m.value === mode)

  return (
    <Sheet open={open} onOpenChange={(next) => {
      onOpenChange(next)
      if (!next) reset()
    }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        {/* Gradient header strip */}
        <div className={`bg-gradient-to-r ${activeMode?.gradient ?? "from-teal-500/10 to-cyan-500/10"} border-b border-border/40 px-6 py-4 transition-all duration-500`}>
          <SheetHeader>
            <SheetTitle className="text-base">MindFresh — 15-second reset</SheetTitle>
          </SheetHeader>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <div key={m.value} className="relative">
                {mode === m.value && (
                  <motion.div
                    layoutId="mode-highlight"
                    className={`absolute inset-0 rounded-md bg-gradient-to-br ${m.gradient} border`}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  className={`relative w-full h-auto flex-col gap-0.5 py-2.5 border-transparent ${mode === m.value ? m.activeText : ""}`}
                  onClick={() => handleModeChange(m.value)}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{m.sub}</span>
                </Button>
              </div>
            ))}
          </div>

          <MoodCheckIn value={mood} onChange={handleMoodChange} />

          <AnimatePresence mode="wait">
            {!completed && (
              <motion.div
                key={`activity-${activityKey.current}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {item.type === "breathing" && (
                  <BreathingBlob key={activityKey.current} onDone={complete} />
                )}
                {item.type === "game" && (
                  <BubblePopGame onDone={complete} />
                )}
                {item.type !== "breathing" && item.type !== "game" && (
                  <>
                    <CountdownRing
                      key={activityKey.current}
                      durationSeconds={item.durationSeconds}
                      onComplete={complete}
                    />
                    {isLoadingAi
                      ? <p className="text-xs text-muted-foreground text-center animate-pulse py-4">Writing a fresh line…</p>
                      : <QuoteCard item={displayItem} showInput={item.type === "prompt"} />
                    }
                  </>
                )}
              </motion.div>
            )}

            {completed && (
              <motion.div
                key="completion"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-6"
              >
                <StickerPlop />
                <CompletionCard mood={mood} />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={reset}
          >
            Try another
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
