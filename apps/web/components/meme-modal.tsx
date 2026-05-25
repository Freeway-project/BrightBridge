"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCw, Sparkles } from "lucide-react"

interface MemeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QUOTES = [
  "Small steps count. Keep going.",
  "Progress beats perfection every time.",
  "Breathe in. Reset. Continue.",
  "You do not need to rush to do good work.",
  "Done calmly is still done well.",
  "Focus on the next right thing.",
  "You are building momentum right now.",
  "A clear mind makes better decisions.",
  "One task at a time is enough.",
  "Steady effort wins.",
]

export function MemeModal({ open, onOpenChange }: MemeModalProps) {
  const [index, setIndex] = useState(0)

  const randomMessage = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)]
  }, [open])

  const currentQuote = QUOTES[index % QUOTES.length]
  const nextQuote = () => setIndex((value) => (value + 1) % QUOTES.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-pink-500/30 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-violet-900/60 shadow-2xl shadow-pink-500/40">
        <div className="flex flex-col items-center gap-6 py-4">
          <Sparkles className="h-10 w-10 text-pink-300" />
          <p className="text-sm text-pink-200/90">{randomMessage}</p>
          <div className="w-full rounded-xl border border-pink-400/30 bg-slate-950/40 p-8 text-center">
            <p className="text-xl font-semibold leading-relaxed text-white">{currentQuote}</p>
          </div>
          <Button
            onClick={nextQuote}
            className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
          >
            <RotateCw className="h-4 w-4" />
            Next Quote
          </Button>
        </div>

        <div className="border-t border-pink-500/30 pt-4 text-center">
          <p className="text-xs text-pink-300/80">Use this for a quick mental reset.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
