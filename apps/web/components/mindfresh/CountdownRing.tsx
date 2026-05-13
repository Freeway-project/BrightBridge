"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const SIZE = 96
const STROKE = 7
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GRADIENT_ID = "countdown-gradient"

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
      <svg width={SIZE} height={SIZE} className="-rotate-90" overflow="visible">
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/20"
        />

        {/* Progress arc */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${GRADIENT_ID})`}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeLinecap="round"
          filter="url(#ring-glow)"
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: "linear" }}
        />

        {/* Countdown number — upright */}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight="600"
          style={{
            transform: `rotate(90deg)`,
            transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
            fill: "currentColor",
          }}
        >
          {remaining}
        </text>
      </svg>
    </div>
  )
}
