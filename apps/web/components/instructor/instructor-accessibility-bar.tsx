"use client"

import { AArrowDown, AArrowUp, Rows3 } from "lucide-react"
import { useTweaks } from "@/components/shared/tweak-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FONT_ORDER = ["small", "medium", "large", "xl", "xxl"] as const
const SPACING_ORDER = ["compact", "normal", "spacious"] as const
const SPACING_LABEL: Record<(typeof SPACING_ORDER)[number], string> = {
  compact: "Compact",
  normal: "Comfortable",
  spacious: "Spacious",
}

/**
 * A prominent, always-visible accessibility toolbar for the instructor area —
 * larger text and reading-spacing controls, unlike the small sidebar popover the
 * other roles use. Backed by the shared TweakProvider (persists to localStorage).
 */
export function InstructorAccessibilityBar() {
  const { settings, setSettings } = useTweaks()

  const fontIndex = Math.max(0, FONT_ORDER.indexOf(settings.fontSize))
  const spacingIndex = Math.max(0, SPACING_ORDER.indexOf(settings.spacing))

  const setFont = (delta: number) => {
    const next = FONT_ORDER[Math.min(FONT_ORDER.length - 1, Math.max(0, fontIndex + delta))]
    setSettings({ fontSize: next })
  }

  const cycleSpacing = () => {
    const next = SPACING_ORDER[(spacingIndex + 1) % SPACING_ORDER.length]
    setSettings({ spacing: next })
  }

  return (
    <div
      role="toolbar"
      aria-label="Reading & accessibility controls"
      className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-6 py-2.5"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Reading controls
      </span>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setFont(-1)}
          disabled={fontIndex === 0}
          aria-label="Decrease text size"
        >
          <AArrowDown className="size-4" /> Smaller
        </Button>
        <span className="min-w-[3.5rem] text-center text-sm font-medium" aria-live="polite">
          Text {fontIndex + 1}/{FONT_ORDER.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setFont(1)}
          disabled={fontIndex === FONT_ORDER.length - 1}
          aria-label="Increase text size"
        >
          <AArrowUp className="size-4" /> Larger
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className={cn("h-9 gap-1.5")}
        onClick={cycleSpacing}
        aria-label={`Spacing: ${SPACING_LABEL[settings.spacing]}. Click to change.`}
      >
        <Rows3 className="size-4" /> Spacing: {SPACING_LABEL[settings.spacing]}
      </Button>
    </div>
  )
}
