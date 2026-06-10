"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface MeteorsProps {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  /** Colors cycled across the meteors. Defaults to a vivid multi-hue palette. */
  colors?: string[]
  className?: string
}

const DEFAULT_COLORS = [
  "#818cf8", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#38bdf8", // sky
  "#a78bfa", // purple
  "#34d399", // emerald
  "#fb7185", // rose
]

export const Meteors = ({
  number = 24,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  colors = DEFAULT_COLORS,
  className,
}: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>([])

  useEffect(() => {
    const styles = [...new Array(number)].map((_, i) => {
      const color = colors[i % colors.length]
      return {
        "--angle": -angle + "deg",
        "--meteor-color": color,
        top: "-5%",
        left: `calc(0% + ${Math.floor(Math.random() * window.innerWidth)}px)`,
        animationDelay: Math.random() * (maxDelay - minDelay) + minDelay + "s",
        animationDuration:
          Math.floor(Math.random() * (maxDuration - minDuration) + minDuration) + "s",
        background: color,
        boxShadow: `0 0 0 1px #ffffff10, 0 0 8px 1px ${color}`,
      } as React.CSSProperties
    })
    setMeteorStyles(styles)
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle, colors])

  return (
    <>
      {meteorStyles.map((style, idx) => (
        // Meteor head
        <span
          key={idx}
          style={{ ...style }}
          className={cn(
            "animate-meteor pointer-events-none absolute size-0.5 rotate-(--angle) rounded-full",
            className,
          )}
        >
          {/* Meteor tail — gradient from the meteor's own color to transparent */}
          <div
            className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2"
            style={{
              backgroundImage: "linear-gradient(to right, var(--meteor-color), transparent)",
            }}
          />
        </span>
      ))}
    </>
  )
}
