"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { playUpgradeConfetti } from "@/components/shared/upgrade-confetti"
import { BIRTHDAY_AGE_TO } from "@/lib/birthday/config"

const DURATION_MS = 5200
const PALETTE = ["#ff5fa2", "#ffd54a", "#8b5cf6", "#34d399", "#38bdf8", "#fb7185"]

type Balloon = {
  id: number
  left: string
  color: string
  size: number
  duration: number
  delay: number
  sway: number
}

function makeBalloons(): Balloon[] {
  return Array.from({ length: 9 }, (_, id) => ({
    id,
    left: `${6 + Math.random() * 88}%`,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    size: 26 + Math.random() * 16,
    duration: 4.8 + Math.random() * 1.6,
    delay: Math.random() * 0.7,
    sway: 8 + Math.random() * 14,
  }))
}

function greetingFor(name: string): string {
  const who = name ? `, ${name}` : ""
  const options = [
    `🎉 Happy Birthday${who}!`,
    `🎂 It's your day${who}!`,
    `${BIRTHDAY_AGE_TO} looks good on you${who}!`,
    `Make a wish${who}! ✨`,
  ]
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Birthday celebration overlay: a confetti burst, a greeting that fades
 * through, and balloons that rise up the screen and can be clicked to pop.
 *
 * Controlled by `playToken`: each time it changes to a new value > 0 the
 * celebration replays. This lets the surprise be both auto-played once on
 * arrival AND re-triggered on demand by the surprise button. All randomness
 * is generated in the effect (post-mount) to avoid SSR hydration mismatch.
 */
export function BalloonCelebration({
  playToken = 0,
  name = "",
}: {
  playToken?: number
  name?: string
}) {
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [greeting, setGreeting] = useState("")
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (playToken <= 0) return
    setBalloons(makeBalloons())
    setGreeting(greetingFor(name))
    setVisible(true)
    playUpgradeConfetti({ durationMs: 4200, intensity: "high" })

    const t = setTimeout(() => setVisible(false), DURATION_MS)
    return () => clearTimeout(t)
  }, [playToken, name])

  if (!visible) return null

  const pop = (id: number, e: MouseEvent) => {
    setBalloons((bs) => bs.filter((b) => b.id !== id))
    confetti({
      particleCount: 28,
      spread: 65,
      startVelocity: 22,
      scalar: 0.8,
      ticks: 120,
      zIndex: 130,
      colors: PALETTE,
      origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
    })
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {/* Greeting fades in and out */}
      <motion.div
        className="absolute inset-x-0 top-[16%] flex justify-center px-4"
        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -8], scale: [0.92, 1, 1, 0.98] }}
        transition={{ duration: DURATION_MS / 1000, times: [0, 0.12, 0.84, 1], ease: "easeInOut" }}
      >
        <div
          className="rounded-3xl border border-primary/30 bg-background/80 px-7 py-5 text-center shadow-2xl backdrop-blur-md"
          style={{ boxShadow: "var(--primary-glow)" }}
        >
          <p className="text-2xl font-black tracking-tight text-foreground">{greeting}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            You&apos;re officially {BIRTHDAY_AGE_TO}. 🎉
          </p>
        </div>
      </motion.div>

      {/* Rising, poppable balloons */}
      {balloons.map((b) => (
        <motion.button
          key={b.id}
          type="button"
          aria-label="Pop balloon"
          onClick={(e) => pop(b.id, e)}
          className="pointer-events-auto absolute bottom-0 cursor-pointer border-0 bg-transparent p-0"
          style={{ left: b.left }}
          initial={{ y: "15vh" }}
          animate={{ y: "-120vh", x: [0, b.sway, -b.sway, 0] }}
          transition={{
            y: { duration: b.duration, delay: b.delay, ease: "easeIn" },
            x: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {/* balloon body */}
          <span
            className="block rounded-[50%] shadow-lg"
            style={{
              width: b.size,
              height: b.size * 1.22,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), ${b.color} 60%)`,
            }}
          />
          {/* knot + string */}
          <span
            className="mx-auto block h-7 w-px"
            style={{ background: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}
          />
        </motion.button>
      ))}
    </div>
  )
}
