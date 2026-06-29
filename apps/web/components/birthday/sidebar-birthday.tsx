"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BIRTHDAY_AGE_FROM, BIRTHDAY_AGE_TO } from "@/lib/birthday/config"

/** Small balloons that pop up around the cake once the age has flipped. */
const BALLOONS = [
  { emoji: "🎈", color: "#ff5fa2", delay: 0.0, x: -22, rot: -8 },
  { emoji: "🎈", color: "#ffd54a", delay: 0.12, x: 0, rot: 0 },
  { emoji: "🎈", color: "#8b5cf6", delay: 0.24, x: 22, rot: 8 },
]

/**
 * The left-sidebar centerpiece for Ava's birthday.
 *
 * Phase 1: an odometer-style flip from 19 → 20.
 * Phase 2 (once flipped): a cake with a flickering candle and balloons that
 * pop up and gently bob. Lives in the same slot the sidebar normally uses for
 * its theme Lottie.
 */
export function SidebarBirthday({ name = "" }: { name?: string }) {
  const [age, setAge] = useState(BIRTHDAY_AGE_FROM)
  const flipped = age === BIRTHDAY_AGE_TO

  useEffect(() => {
    const t = setTimeout(() => setAge(BIRTHDAY_AGE_TO), 1100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sidebar-border bg-gradient-to-b from-primary/10 to-secondary/5 px-3 py-4 text-center shadow-inner">
      {/* Cake + age odometer */}
      <div className="flex items-center justify-center gap-2">
        <motion.span
          aria-hidden
          className="text-2xl"
          animate={{ rotate: [0, -6, 6, 0], y: [0, -1.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          🎂
        </motion.span>

        <div className="relative h-11 w-[3.2rem] overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={age}
              initial={{ y: "110%", opacity: 0, rotateX: -60 }}
              animate={{ y: "0%", opacity: 1, rotateX: 0 }}
              exit={{ y: "-110%", opacity: 0, rotateX: 60 }}
              transition={{ type: "spring", damping: 15, stiffness: 230 }}
              className="absolute inset-0 flex items-center justify-center text-4xl font-black leading-none text-primary"
              style={{ textShadow: "var(--primary-glow)" }}
            >
              {age}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Caption */}
      <motion.p
        key={flipped ? "after" : "before"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: flipped ? 0.15 : 0 }}
        className="mt-2 text-[11px] font-black uppercase tracking-wider text-foreground/80"
      >
        {flipped ? `Happy 20th${name ? `, ${name}` : ""}! 🥳` : "Turning…"}
      </motion.p>

      {/* Balloons pop up after the flip */}
      <div className="mt-1 flex h-7 items-end justify-center gap-2">
        <AnimatePresence>
          {flipped &&
            BALLOONS.map((b, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ y: 18, scale: 0, opacity: 0 }}
                animate={{
                  y: [0, -4, 0],
                  scale: 1,
                  opacity: 1,
                  x: b.x,
                  rotate: b.rot,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  scale: { type: "spring", damping: 11, stiffness: 200, delay: 0.2 + b.delay },
                  opacity: { delay: 0.2 + b.delay },
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 + b.delay },
                }}
                className="text-xl"
                style={{ color: b.color }}
              >
                {b.emoji}
              </motion.span>
            ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
