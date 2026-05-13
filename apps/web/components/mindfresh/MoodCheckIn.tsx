"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CheckInMood } from "@/components/mindfresh/types"

const OPTIONS: { value: CheckInMood; emoji: string; label: string }[] = [
  { value: "overwhelmed", emoji: "😵", label: "Overloaded" },
  { value: "neutral", emoji: "😐", label: "Flat" },
  { value: "good", emoji: "🙂", label: "Okay" },
  { value: "energized", emoji: "🔥", label: "Energized" },
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
          <Button
            key={option.value}
            type="button"
            variant="outline"
            className={cn("h-auto flex-col gap-1 py-2", value === option.value && "border-primary bg-primary/10")}
            onClick={() => onChange(option.value)}
          >
            <span className="text-xl" aria-hidden="true">{option.emoji}</span>
            <span className="text-[11px]">{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
