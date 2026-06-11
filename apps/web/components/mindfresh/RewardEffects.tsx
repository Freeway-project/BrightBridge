"use client"

import confetti from "canvas-confetti"
import type { MindFreshMode } from "./types"

/**
 * Triggers a thematic "rain" of emojis based on the MindFresh mode.
 */
export function playThematicReward(mode: MindFreshMode) {
  const duration = 3 * 1000
  const end = Date.now() + duration

  const config = {
    calm: {
      emojis: ["🍃", "🌊", "🧘", "✨", "☁️"],
      scalar: 2,
      spread: 70,
    },
    funny: {
      emojis: ["😂", "🤡", "🍌", "🐥", "🧦"],
      scalar: 3,
      spread: 100,
    },
    focus: {
      emojis: ["🎯", "⚡", "🧠", "🔥", "🚀"],
      scalar: 2.5,
      spread: 60,
    },
    random: {
      emojis: ["🌈", "🍭", "🎨", "👾", "⭐"],
      scalar: 2,
      spread: 80,
    },
  }[mode]

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: config.spread,
      origin: { x: 0 },
      shapes: config.emojis.map((emoji) => confetti.shapeFromText({ text: emoji })),
      scalar: config.scalar,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: config.spread,
      origin: { x: 1 },
      shapes: config.emojis.map((emoji) => confetti.shapeFromText({ text: emoji })),
      scalar: config.scalar,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

/**
 * Triggers a small localized "pop" effect at a specific coordinate.
 */
export function playPopEffect(x: number, y: number) {
  confetti({
    particleCount: 15,
    spread: 360,
    startVelocity: 20,
    origin: {
      x: x / window.innerWidth,
      y: y / window.innerHeight,
    },
    colors: ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f43f5e"],
    shapes: ["circle"],
    ticks: 60,
    gravity: 0.5,
    scalar: 0.7,
  })
}
