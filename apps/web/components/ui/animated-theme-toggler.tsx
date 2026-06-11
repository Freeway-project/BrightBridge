"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { cn } from "@/lib/utils"

export type TransitionVariant = "circle" | "diamond" | "hexagon"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
  variant?: TransitionVariant
  fromCenter?: boolean
}


function polygonCollapsed(cx: number, cy: number, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => `${cx}px ${cy}px`).join(", ")
  return `polygon(${pairs})`
}

function getClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number
): [string, string] {
  if (variant === "diamond") {
    const r = maxRadius * Math.SQRT2
    return [
      polygonCollapsed(cx, cy, 4),
      `polygon(${cx}px ${cy - r}px, ${cx + r}px ${cy}px, ${cx}px ${cy + r}px, ${cx - r}px ${cy}px)`,
    ]
  }

  if (variant === "hexagon") {
    const r = maxRadius * Math.SQRT2
    const verts: string[] = []
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3
      verts.push(`${cx + r * Math.cos(a)}px ${cy + r * Math.sin(a)}px`)
    }
    return [polygonCollapsed(cx, cy, 6), `polygon(${verts.join(", ")})`]
  }

  return [`circle(0px at ${cx}px ${cy}px)`, `circle(${maxRadius}px at ${cx}px ${cy}px)`]
}

export function runThemeTransition(
  x: number,
  y: number,
  applyFn: () => void,
  options?: { variant?: TransitionVariant; duration?: number }
) {
  const variant = options?.variant ?? "circle"
  const duration = options?.duration ?? 420

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y)
  )

  if (typeof (document as any).startViewTransition !== "function") {
    applyFn()
    return
  }

  const clipPath = getClipPaths(variant, x, y, maxRadius)
  const root = document.documentElement
  root.dataset.magicuiThemeVt = "active"
  root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`)
  root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0])

  const cleanup = () => {
    delete root.dataset.magicuiThemeVt
    root.style.removeProperty("--magicui-theme-toggle-vt-duration")
    root.style.removeProperty("--magicui-theme-vt-clip-from")
  }

  const transition = (document as any).startViewTransition(() => flushSync(applyFn))
  transition.finished.finally(cleanup)
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath },
      {
        duration,
        easing: "ease-in-out",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  })
}

export function AnimatedThemeToggler({
  className,
  duration = 420,
  variant = "circle",
  fromCenter = false,
  ...props
}: AnimatedThemeTogglerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const syncTheme = () => setIsDark(document.documentElement.classList.contains("dark"))
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight

    const rect = button.getBoundingClientRect()
    const x = fromCenter ? viewportWidth / 2 : rect.left + rect.width / 2
    const y = fromCenter ? viewportHeight / 2 : rect.top + rect.height / 2

    runThemeTransition(x, y, () => {
      const nextIsDark = !isDark
      setIsDark(nextIsDark)
      document.documentElement.classList.toggle("dark", nextIsDark)
      localStorage.setItem("theme-mode", nextIsDark ? "dark" : "light")
    }, { variant, duration })
  }, [duration, fromCenter, isDark, variant])

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2.5 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent",
        className
      )}
      {...props}
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      <span>{isDark ? "Light" : "Dark"} mode</span>
    </button>
  )
}
