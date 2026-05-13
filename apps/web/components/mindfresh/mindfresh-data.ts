import type { MindFreshItem, MindFreshMode } from "@/components/mindfresh/types"

export const MINDFRESH_ITEMS: MindFreshItem[] = [
  // calm — grounding, no therapy-speak
  {
    id: "q1",
    type: "quote",
    text: "You don't have to have it figured out yet. Nobody your age actually does.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q2",
    type: "quote",
    text: "The version of you from 2 years ago would be shocked at how far you've come.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q3",
    type: "quote",
    text: "You're not behind. There's no real schedule for life.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q4",
    type: "quote",
    text: "Look at one thing near you for 10 seconds. Just notice the color. That's it.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q7",
    type: "quote",
    text: "Social media is a highlight reel. Your life is the full movie.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q8",
    type: "quote",
    text: "You're allowed to just exist for 15 seconds without producing anything.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  // calm — breathing
  {
    id: "b1",
    type: "breathing",
    text: "Breathe in for 4, hold for 2, exhale for 6.",
    moodTag: "calm",
    durationSeconds: 24,
  },
  {
    id: "b2",
    type: "breathing",
    text: "Two slow rounds. Follow the blob.",
    moodTag: "calm",
    durationSeconds: 24,
  },
  // funny — relatable under-25 humor, no tech jokes
  {
    id: "f1",
    type: "funny",
    text: "You remembered to eat today. That's a win.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f2",
    type: "funny",
    text: "You're not behind. You're just in your main character arc.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f3",
    type: "funny",
    text: "Imagine telling your 10-year-old self what you're stressed about right now.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f4",
    type: "funny",
    text: "Your situationship has no power over you in this moment.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f5",
    type: "funny",
    text: "The rent is due but this 15 seconds is completely rent-free.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f6",
    type: "funny",
    text: "Nobody here is thinking about you as much as you think they are.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f7",
    type: "funny",
    text: "Plot twist: it's probably going to be fine.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  // focus — real talk prompts
  {
    id: "p1",
    type: "prompt",
    text: "What's the one thing you'd actually regret not doing today?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p2",
    type: "prompt",
    text: "What are you avoiding right now? Name it.",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p3",
    type: "prompt",
    text: "If you had 10 minutes of full focus, what would you use it on?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p4",
    type: "prompt",
    text: "What would your most pulled-together self do right now?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p5",
    type: "prompt",
    text: "Pick one thing. Just one. What is it?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  // energy — fun physical resets + bubble game
  {
    id: "g1",
    type: "game",
    text: "Pop all the bubbles to reset your focus.",
    moodTag: "energy",
    durationSeconds: 12,
  },
  {
    id: "q5",
    type: "quote",
    text: "Shake your hands out like you're air-drying them. 10 seconds. Go.",
    moodTag: "energy",
    durationSeconds: 15,
  },
  {
    id: "q6",
    type: "quote",
    text: "Roll your shoulders back three times. Actually do it.",
    moodTag: "energy",
    durationSeconds: 15,
  },
  {
    id: "q9",
    type: "quote",
    text: "Jaw dropped, shoulders down. Hold it for five seconds.",
    moodTag: "energy",
    durationSeconds: 15,
  },
  {
    id: "q10",
    type: "quote",
    text: "Stand up, stretch your arms up, sit back down. Done.",
    moodTag: "energy",
    durationSeconds: 15,
  },
]

const MODE_TO_MOOD: Record<Exclude<MindFreshMode, "random">, MindFreshItem["moodTag"]> = {
  calm: "calm",
  funny: "funny",
  focus: "focus",
}

export function pickMindFreshItem(mode: MindFreshMode): MindFreshItem {
  const candidates =
    mode === "random"
      ? MINDFRESH_ITEMS
      : MINDFRESH_ITEMS.filter((item) => item.moodTag === MODE_TO_MOOD[mode])

  if (candidates.length === 0) {
    return MINDFRESH_ITEMS[Math.floor(Math.random() * MINDFRESH_ITEMS.length)]
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}
