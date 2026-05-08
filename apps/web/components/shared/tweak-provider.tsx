"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type TweakSettings = {
  fontSize: "small" | "medium" | "large"
  density: "compact" | "regular" | "comfy"
}

type TweakContextType = {
  settings: TweakSettings
  setSettings: (settings: Partial<TweakSettings>) => void
}

const TweakContext = createContext<TweakContextType | undefined>(undefined)

const STORAGE_KEY = "coursebridge-display-settings"

const DENSITY_MAP: Record<TweakSettings["density"], string> = {
  compact: "0.75rem",
  regular: "1rem",
  comfy: "1.5rem",
}

const FONT_SIZE_MAP: Record<TweakSettings["fontSize"], string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
}

export function TweakProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<TweakSettings>({
    fontSize: "medium",
    density: "regular",
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettingsState(parsed)
      } catch (e) {
        console.error("Failed to load tweak settings", e)
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
    root.style.setProperty("--card-spacing", DENSITY_MAP[settings.density])
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
