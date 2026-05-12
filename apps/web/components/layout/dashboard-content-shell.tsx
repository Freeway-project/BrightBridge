"use client"

import type { ReactNode } from "react"
import { useTweaks } from "@/components/shared/tweak-provider"

const FONT_SCALE_MAP = {
  small: 0.875,
  medium: 1,
  large: 1.125,
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
      className="flex flex-1 flex-col overflow-hidden min-w-0"
      style={{ zoom: scale }}
    >
      {children}
    </div>
  )
}
