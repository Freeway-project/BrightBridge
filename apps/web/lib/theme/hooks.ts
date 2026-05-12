'use client'

import { useEffect, useState } from 'react'
import { ThemeType, THEME_PALETTES } from './config'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>('ocean')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get theme from document data attribute or default to ocean
    const htmlElement = document.documentElement
    const currentTheme = (htmlElement.getAttribute('data-theme') as ThemeType) || 'ocean'
    setTheme(currentTheme)
    setMounted(true)
  }, [])

  const applyTheme = (newTheme: ThemeType) => {
    const palette = THEME_PALETTES[newTheme]
    const root = document.documentElement

    // Set CSS variables for the theme
    root.style.setProperty('--dt-100', palette.darkTwilightBase)
    root.style.setProperty('--dt-300', palette.darkTwilightMid)
    root.style.setProperty('--dt-400', palette.darkTwilightDeep)
    root.style.setProperty('--ts-500', palette.primary)
    root.style.setProperty('--ts-600', palette.primaryLight)
    root.style.setProperty('--bt-500', palette.secondary)
    root.style.setProperty('--fb-500', palette.accent)
    root.style.setProperty('--lc-500', palette.foreground)
    root.style.setProperty('--lc-900', palette.foreground)

    // Update background and foreground CSS variables
    root.style.setProperty('--background', palette.darkTwilightBase)
    root.style.setProperty('--foreground', palette.foreground)
    root.style.setProperty('--card', palette.darkTwilightMid)
    root.style.setProperty('--card-foreground', palette.accent)
    root.style.setProperty('--primary', palette.primary)
    root.style.setProperty('--primary-hover', palette.primaryLight)
    root.style.setProperty('--secondary', palette.secondary)
    root.style.setProperty('--muted', palette.darkTwilightDeep)
    root.style.setProperty('--muted-foreground', palette.muted)
    root.style.setProperty('--accent', palette.accent)

    // Store theme in document
    root.setAttribute('data-theme', newTheme)

    setTheme(newTheme)
  }

  return {
    theme,
    applyTheme,
    mounted,
    palette: THEME_PALETTES[theme],
  }
}
