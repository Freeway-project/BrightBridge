"use client"

import { motion } from "framer-motion"
import { BIRTHDAY_AGE_TO } from "@/lib/birthday/config"

/** A few balloons that drift slowly in the background corners — subtle, behind content. */
const DRIFTERS = [
  { left: "6%", emoji: "🎈", color: "#ff5fa2", duration: 9, delay: 0 },
  { left: "84%", emoji: "🎈", color: "#ffd54a", duration: 11, delay: 1.5 },
  { left: "70%", emoji: "🎈", color: "#8b5cf6", duration: 10, delay: 3 },
]

/**
 * Always-on (while the surprise is active) festive dressing for the dashboard:
 * a small corner ribbon and a few slow-drifting balloons. Rendered as a
 * fixed, pointer-events-none overlay so it never covers or blocks real UI.
 */
export function BirthdayDecorations({ name = "" }: { name?: string }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Slow-drifting background balloons */}
      {DRIFTERS.map((b, i) => (
        <motion.span
          key={i}
          className="absolute bottom-[-3rem] text-3xl opacity-20"
          style={{ left: b.left, color: b.color }}
          initial={{ y: 0 }}
          animate={{ y: ["0%", "-130vh"], x: [0, 14, -10, 0], rotate: [0, 6, -6, 0] }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {b.emoji}
        </motion.span>
      ))}

      {/* Corner ribbon */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 16, stiffness: 220, delay: 0.4 }}
        className="absolute right-4 top-3 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-foreground shadow-lg backdrop-blur-md"
        style={{ boxShadow: "var(--primary-glow)" }}
      >
        <span aria-hidden>🎂</span>
        <span>Happy {BIRTHDAY_AGE_TO}th{name ? `, ${name}` : ""}!</span>
      </motion.div>
    </div>
  )
}
