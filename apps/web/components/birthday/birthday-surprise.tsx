"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BalloonCelebration } from "./balloon-celebration"

const SESSION_KEY = "coursebridge-birthday-celebrated"

/**
 * Owns Ava's celebration trigger.
 *
 * Renders a always-visible, gently-bobbing "Surprise!" button so she can play
 * the balloons + confetti on demand (and as many times as she likes) — it's
 * never just running in the background where she'd miss it. It also auto-plays
 * once on her first arrival of the session for an immediate hello.
 */
export function BirthdaySurprise({ name = "" }: { name?: string }) {
  const [token, setToken] = useState(0)

  // Auto-play exactly once per browser session on first landing.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, "1")
    setToken((t) => t + 1)
  }, [])

  return (
    <>
      <BalloonCelebration playToken={token} name={name} />

      <motion.button
        type="button"
        onClick={() => setToken((t) => t + 1)}
        aria-label="Play my birthday surprise"
        className="pointer-events-auto fixed bottom-5 right-5 z-[55] flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-xl"
        style={{ boxShadow: "var(--primary-glow)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: [0, -4, 4, -4, 0] }}
        transition={{
          scale: { type: "spring", damping: 12, stiffness: 200, delay: 0.6 },
          opacity: { delay: 0.6 },
          rotate: { duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <span aria-hidden className="text-base">🎁</span>
        Surprise!
      </motion.button>
    </>
  )
}
