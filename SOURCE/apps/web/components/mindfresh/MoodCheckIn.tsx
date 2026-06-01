"use client"

import { cn } from "@/lib/utils"
import type { CheckInMood } from "@/components/mindfresh/types"

const OPTIONS: {
  value: CheckInMood
  emoji: string
  label: string
  selected: string
}[] = [
  {
    value: "overwhelmed",
    emoji: "😵",
    label: "Overloaded",
    selected: "border-rose-400 bg-gradient-to-b from-rose-50 to-rose-100/60 dark:from-rose-950/60 dark:to-rose-900/30 dark:border-rose-600",
  },
  {
    value: "neutral",
    emoji: "😐",
    label: "Flat",
    selected: "border-slate-400 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-700/30 dark:border-slate-500",
  },
  {
    value: "good",
    emoji: "🙂",
    label: "Okay",
    selected: "border-teal-400 bg-gradient-to-b from-teal-50 to-cyan-100/60 dark:from-teal-950/60 dark:to-cyan-900/30 dark:border-teal-600",
  },
  {
    value: "energized",
    emoji: "🔥",
    label: "Energized",
    selected: "border-amber-400 bg-gradient-to-b from-amber-50 to-orange-100/60 dark:from-amber-950/60 dark:to-orange-900/30 dark:border-amber-500",
  },
]

export function MoodCheckIn({
  value,
  onChange,
}: {
  value: CheckInMood | null
  onChange: (value: CheckInMood) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">How are you feeling right now?</p>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "h-auto flex flex-col items-center gap-1 py-2.5 rounded-md border text-xs font-medium transition-all duration-200",
              "border-border bg-background hover:bg-muted/50",
              value === option.value && option.selected,
              value === option.value && "shadow-sm scale-[1.03]"
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="text-xl leading-none" aria-hidden="true">{option.emoji}</span>
            <span className="text-[11px]">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
