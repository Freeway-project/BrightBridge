"use client"

import { useEffect } from "react"

/**
 * Applies the birthday palette by setting `data-skin="birthday"` on <html>
 * while mounted, and removing it on unmount.
 *
 * It deliberately does NOT write to the TweakProvider's stored theme, so the
 * takeover is session-only: when the surprise ends (flag off / next day /
 * sign-out) Ava's own theme is exactly as she left it. The matching CSS lives
 * in `globals.css` under `:root[data-skin="birthday"]`, which out-specifies the
 * `[data-theme="..."]` blocks so it cleanly overrides her selected theme.
 *
 * Renders nothing.
 */
export function BirthdaySkinController() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-skin", "birthday")
    return () => root.removeAttribute("data-skin")
  }, [])

  return null
}
