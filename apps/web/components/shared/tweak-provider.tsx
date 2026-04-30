"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type TweakSettings = {
  fontSize: number
  density: "compact" | "regular" | "comfy"
}

type TweakContextType = {
  settings: TweakSettings
  setSettings: (settings: Partial<TweakSettings>) => void
}

const TweakContext = createContext<TweakContextType | undefined>(undefined)

const STORAGE_KEY = "coursebridge-display-settings"

const DENSITY_MAP = {
  compact: "0.75rem",
  regular: "1rem",
  comfy: "1.5rem",
}

export function TweakProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<TweakSettings>({
    fontSize: 16,
    density: "regular",
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setSettingsState(JSON.parse(saved))
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

  return (
    <TweakContext.Provider value={{ settings, setSettings }}>
      <div 
        style={{ 
          // @ts-ignore - custom properties
          "--base-font-size": `${settings.fontSize}px`,
          "--card-spacing": DENSITY_MAP[settings.density],
          fontSize: "var(--base-font-size)",
        }}
        className="contents"
      >
        {children}
      </div>
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
