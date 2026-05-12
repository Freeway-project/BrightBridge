"use client"

import { useTweaks, type ThemeId } from "@/components/shared/tweak-provider"
import { cn } from "@/lib/utils"

const THEMES: { id: ThemeId; label: string; swatch: string; ring: string }[] = [
  { id: "ocean",      label: "Ocean",      swatch: "bg-[#00b4d8]", ring: "ring-[#00b4d8]" },
  { id: "sunset",     label: "Candy",      swatch: "bg-[#ec4899]", ring: "ring-[#ec4899]" },
  { id: "monochrome", label: "Mono",       swatch: "bg-[#ffffff]", ring: "ring-[#ffffff]"  },
  { id: "aurora",     label: "Aurora",     swatch: "bg-[#c026d3]", ring: "ring-[#c026d3]" },
]

export function ThemeSwitcher() {
  const { settings, setSettings } = useTweaks()

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium text-foreground/70">
        <span className="text-base leading-none">🎨</span>
        Theme
      </label>
      <div className="grid grid-cols-4 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSettings({ theme: t.id })}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all",
              "hover:bg-white/5",
              settings.theme === t.id ? "bg-white/10" : ""
            )}
            title={t.label}
          >
            <span
              className={cn(
                "size-6 rounded-full",
                t.swatch,
                settings.theme === t.id ? cn("ring-2 ring-offset-2 ring-offset-background", t.ring) : ""
              )}
            />
            <span className={cn(
              "text-[9px] font-medium",
              settings.theme === t.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
