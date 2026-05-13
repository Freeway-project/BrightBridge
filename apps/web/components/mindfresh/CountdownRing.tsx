"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const SIZE = 96
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CountdownRing({
  durationSeconds,
  onComplete,
}: {
  durationSeconds: number
  onComplete: () => void
}) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const doneRef = useRef(false)

  useEffect(() => {
    doneRef.current = false
    setRemaining(durationSeconds)

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!doneRef.current) {
            doneRef.current = true
            setTimeout(onComplete, 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [durationSeconds, onComplete])

  const progress = remaining / durationSeconds
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="flex justify-center py-1">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/30"
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeLinecap="round"
          className="text-teal-500"
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-sm font-semibold tabular-nums"
          style={{ transform: "rotate(90deg)", transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`, fontSize: 18 }}
        >
          {remaining}
        </text>
      </svg>
    </div>
  )
}
