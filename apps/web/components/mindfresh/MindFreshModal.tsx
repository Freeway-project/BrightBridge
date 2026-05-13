"use client"

import { useEffect, useMemo, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MoodCheckIn } from "@/components/mindfresh/MoodCheckIn"
import { QuoteCard } from "@/components/mindfresh/QuoteCard"
import { BreathingBlob } from "@/components/mindfresh/BreathingBlob"
import { BubblePopGame } from "@/components/mindfresh/BubblePopGame"
import { CompletionCard } from "@/components/mindfresh/CompletionCard"
import { pickMindFreshItem } from "@/components/mindfresh/mindfresh-data"
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti"
import type { CheckInMood, MindFreshMode } from "@/components/mindfresh/types"

type MindFreshModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODES: MindFreshMode[] = ["calm", "funny", "focus", "random"]

export function MindFreshModal({ open, onOpenChange }: MindFreshModalProps) {
  const [mode, setMode] = useState<MindFreshMode>("random")
  const [mood, setMood] = useState<CheckInMood | null>(null)
  const [completed, setCompleted] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [isLoadingAi, setIsLoadingAi] = useState(false)

  const item = useMemo(() => pickMindFreshItem(mode), [mode, open])
  const isAiCategory = item.type === "quote" || item.type === "funny" || item.type === "prompt"
  const displayItem = aiText ? { ...item, text: aiText } : item

  useEffect(() => {
    async function generateAiText() {
      if (!open || !isAiCategory) {
        setAiText(null)
        return
      }

      setIsLoadingAi(true)
      try {
        const response = await fetch("/api/mindfresh/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            mood,
            category: item.type,
          }),
        })
        if (!response.ok) {
          setAiText(null)
          return
        }

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
    playUpgradeConfetti({ durationMs: 1000 })
  }

  const reset = () => {
    setCompleted(false)
    setMood(null)
    setMode("random")
    setAiText(null)
    setIsLoadingAi(false)
  }

  return (
    <Sheet open={open} onOpenChange={(next) => {
      onOpenChange(next)
      if (!next) {
        reset()
      }
    }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>MindFresh: 15-second reset</SheetTitle>
          <SheetDescription>Choose a mode, take one short reset, then return to your workflow.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <Button
                key={m}
                type="button"
                variant={mode === m ? "default" : "outline"}
                onClick={() => {
                  setCompleted(false)
                  setAiText(null)
                  setMode(m)
                }}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </Button>
            ))}
          </div>

          <MoodCheckIn value={mood} onChange={setMood} />

          {!completed && item.type !== "breathing" && item.type !== "game" && (
            <>
              <QuoteCard item={displayItem} />
              {isLoadingAi && <p className="text-xs text-muted-foreground">Writing a fresh line...</p>}
            </>
          )}
          {!completed && item.type === "breathing" && <BreathingBlob />}
          {!completed && item.type === "game" && <BubblePopGame onDone={complete} />}

          {!completed && item.type !== "game" && (
            <Button type="button" className="w-full" onClick={complete}>
              I did my 15 seconds
            </Button>
          )}

          {completed && <CompletionCard />}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setCompleted(false)
              setMode("random")
            }}
          >
            Try another
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
