"use client"

import { useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface MemeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QUOTES = [
  "Small steps count. Keep going.",
  "Progress beats perfection every time.",
  "Breathe in. Reset. Continue.",
  "Done calmly is still done well.",
  "Focus on the next right thing.",
  "A clear mind makes better decisions.",
  "One task at a time is enough.",
  "Steady effort wins.",
]

export function MemeModal({ open, onOpenChange }: MemeModalProps) {
  const quote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)]
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-pink-400/30 bg-slate-900 text-white">
        <div className="py-6 text-center">
          <p className="text-base leading-relaxed">{quote}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
