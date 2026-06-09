"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type ThemeId = "blush" | "ocean" | "sunset" | "monochrome" | "aurora"

type TweakSettings = {
  fontSize: "small" | "medium" | "large" | "xl" | "xxl"
  spacing: "compact" | "normal" | "spacious"
  theme: ThemeId
}

type TweakContextType = {
  settings: TweakSettings
  setSettings: (settings: Partial<TweakSettings>) => void
}

const TweakContext = createContext<TweakContextType | undefined>(undefined)

const STORAGE_KEY = "coursebridge-display-settings"
const MODE_STORAGE_KEY = "theme-mode"

const FONT_SIZE_MAP: Record<TweakSettings["fontSize"], string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  xl: "20px",
  xxl: "23px",
}

const SPACING_MAP: Record<TweakSettings["spacing"], { cardSpacing: string; leading: string }> = {
  compact: { cardSpacing: "1rem", leading: "1.45" },
  normal: { cardSpacing: "1.5rem", leading: "1.65" },
  spacious: { cardSpacing: "2rem", leading: "1.85" },
}

const DEFAULT_SETTINGS: TweakSettings = {
  fontSize: "medium",
  spacing: "normal",
  theme: "ocean",
}

export function TweakProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<TweakSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (e) {
        console.error("Failed to load tweak settings", e)
      }
    }

    const savedMode = localStorage.getItem(MODE_STORAGE_KEY)
    if (savedMode === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
      if (!savedMode) {
        localStorage.setItem(MODE_STORAGE_KEY, "dark")
      }
    }
  }, [])

  const setSettings = (updates: Partial<TweakSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--base-font-size", FONT_SIZE_MAP[settings.fontSize])
    const spacing = SPACING_MAP[settings.spacing] ?? SPACING_MAP.normal
    root.style.setProperty("--card-spacing", spacing.cardSpacing)
    root.style.setProperty("--reading-leading", spacing.leading)
    root.setAttribute("data-theme", settings.theme)
  }, [settings])

  return (
    <TweakContext.Provider value={{ settings, setSettings }}>
      {children}
    </TweakContext.Provider>
  )
}

export function useTweaks() {
  const context = useContext(TweakContext)
  if (context === undefined) {
    throw new Error("useTweaks must be used within a TweakProvider")
  }
  return context
}
