"use client";

import confetti from "canvas-confetti";

type ConfettiOptions = {
  durationMs?: number;
  intensity?: "normal" | "high";
};

/**
 * Short celebratory burst used for upgrade/update moments.
 * Intentionally bounded duration to avoid being distracting.
 */
export function playUpgradeConfetti(options: ConfettiOptions = {}) {
  const durationMs = options.durationMs ?? 2200;
  const intensity = options.intensity ?? "normal";
  const end = Date.now() + durationMs;

  const palette = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f43f5e"];
  const particleCount = intensity === "high" ? 5 : 2;
  const spread = intensity === "high" ? 65 : 55;
  const scalar = intensity === "high" ? 1 : 0.9;
  const startVelocity = intensity === "high" ? 45 : 30;

  const frame = () => {
    confetti({
      particleCount,
      angle: 60,
      spread,
      origin: { x: 0 },
      colors: palette,
      startVelocity,
      ticks: 160,
      scalar,
      zIndex: 120,
    });
    confetti({
      particleCount,
      angle: 120,
      spread,
      origin: { x: 1 },
      colors: palette,
      startVelocity,
      ticks: 160,
      scalar,
      zIndex: 120,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
