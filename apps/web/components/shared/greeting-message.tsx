"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"

const TIME_MESSAGES: Record<string, string[]> = {
  morning: [
    "Fresh start, fresh eyes.",
    "Morning momentum.",
    "Let's make it count.",
    "New day, new reviews.",
  ],
  afternoon: [
    "Keep the pace.",
    "You're on a roll.",
    "Stay in the zone.",
    "Making progress.",
  ],
  evening: [
    "Finishing strong.",
    "Almost there.",
    "Last push of the day.",
    "Close it out.",
  ],
  night: [
    "Still going strong.",
    "Burning the midnight oil.",
    "Night shift mode.",
    "Dedication level: high.",
  ],
}

function getTimeSlot() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "morning"
  if (h >= 12 && h < 17) return "afternoon"
  if (h >= 17 && h < 21) return "evening"
  return "night"
}

export function GreetingMessage() {
  const [mounted, setMounted] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const messages = mounted ? TIME_MESSAGES[getTimeSlot()] : []

  useEffect(() => {
    if (!mounted || messages.length === 0) return
    const id = setInterval(() => setIndex(i => (i + 1) % messages.length), 3500)
    return () => clearInterval(id)
  }, [mounted, messages.length])

  if (!mounted) return null

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="text-sm font-medium text-muted-foreground/70 tracking-wide"
      >
        {messages[index]}
      </motion.span>
    </AnimatePresence>
  )
}
