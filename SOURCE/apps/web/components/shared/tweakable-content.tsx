"use client"

import { useTweaks } from "@/components/shared/tweak-provider"
import { cn } from "@/lib/utils"

const FONT_SIZE_MAP = {
  small: "14px",
  medium: "16px",
  large: "18px",
}

export function TweakableContent({ children, className }: { children: React.ReactNode, className?: string }) {
  const { settings } = useTweaks()

  return (
    <div
      style={{
        // @ts-ignore - custom properties
        "--base-font-size": FONT_SIZE_MAP[settings.fontSize],
        fontSize: "var(--base-font-size)",
      }}
      className={cn("min-h-0", className)}
    >
      {children}
    </div>
  )
}
