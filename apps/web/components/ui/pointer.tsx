"use client"

import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  type HTMLMotionProps,
} from "motion/react"

import { cn } from "@/lib/utils"

/** Emoji pool — rotates every 30 minutes */
const CURSOR_EMOJIS = [
  "🚀", "✨", "🎯", "🔥", "💡", "🌈", "🎲", "🦊",
  "🐉", "🌀", "⚡", "🎸", "🍀", "🦋", "🎃", "🌙",
  "🐙", "🦄", "🍭", "🎈",
]

const ROTATION_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

function pickRandomEmoji(exclude?: string): string {
  const pool = exclude ? CURSOR_EMOJIS.filter((e) => e !== exclude) : CURSOR_EMOJIS
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * A custom pointer component that displays an animated cursor.
 * Add this as a child to any component to enable a custom pointer when hovering.
 * When no children are provided it shows a random emoji cursor that rotates every 30 minutes.
 * Pass custom children to render your own pointer content instead.
 *
 * @component
 * @param {HTMLMotionProps<"div">} props - The component props
 */
export function Pointer({
  className,
  style,
  children,
  ...props
}: HTMLMotionProps<"div">): React.ReactNode {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [isActive, setIsActive] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Emoji state — pick once on mount, rotate every 30 min
  const [emoji, setEmoji] = useState<string>(() => pickRandomEmoji())

  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji((prev) => pickRandomEmoji(prev))
    }, ROTATION_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const parentElement =
      typeof window !== "undefined"
        ? (containerRef.current?.parentElement ?? null)
        : null

    const handleMouseMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setIsActive(true)
    }

    const handleMouseEnter = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setIsActive(true)
    }

    const handleMouseLeave = () => {
      setIsActive(false)
    }

    if (parentElement) {
      parentElement.style.cursor = "none"
      parentElement.addEventListener("mousemove", handleMouseMove)
      parentElement.addEventListener("mouseenter", handleMouseEnter)
      parentElement.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (parentElement) {
        parentElement.style.cursor = ""
        parentElement.removeEventListener("mousemove", handleMouseMove)
        parentElement.removeEventListener("mouseenter", handleMouseEnter)
        parentElement.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [x, y])

  return (
    <>
      <div ref={containerRef} />
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
            style={{
              top: y,
              left: x,
              ...style,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            {...props}
          >
            {children || (
              <AnimatePresence mode="wait">
                <motion.span
                  key={emoji}
                  className={cn("block select-none text-2xl leading-none", className)}
                  initial={{ scale: 0, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, rotate: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  aria-hidden="true"
                >
                  {emoji}
                </motion.span>
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
