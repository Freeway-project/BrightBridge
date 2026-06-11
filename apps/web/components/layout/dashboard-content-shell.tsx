"use client"

import type { ReactNode } from "react"
import { useTweaks } from "@/components/shared/tweak-provider"

const FONT_SCALE_MAP = {
  small: 0.875,
  medium: 1,
  large: 1.125,
  xl: 1.25,
  xxl: 1.4,
} as const

type DashboardContentShellProps = {
  children: ReactNode
}

export function DashboardContentShell({ children }: DashboardContentShellProps) {
  const { settings } = useTweaks()
  const scale = FONT_SCALE_MAP[settings.fontSize]

  return (
    <div
      data-app-content
      className="flex flex-1 flex-col overflow-hidden min-w-0 animate-in fade-in slide-in-from-bottom-[10px] duration-500 relative"
      style={{ zoom: scale }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50" />
      {children}
    </div>
  )
}
