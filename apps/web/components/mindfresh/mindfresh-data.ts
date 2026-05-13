import type { MindFreshItem, MindFreshMode } from "@/components/mindfresh/types"

export const MINDFRESH_ITEMS: MindFreshItem[] = [
  // calm — quotes
  {
    id: "q1",
    type: "quote",
    text: "Take one deep breath. You are not behind; you are processing.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q2",
    type: "quote",
    text: "Look at 5 things around you. Name them silently. You're here.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q3",
    type: "quote",
    text: "Slow down for 15 seconds. The work will still be there.",
    moodTag: "calm",
    durationSeconds: 15,
  },
  {
    id: "q4",
    type: "quote",
    text: "Unclench your jaw. Drop your shoulders. You're okay.",
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
  // funny
  {
    id: "f1",
    type: "funny",
    text: "Your brain has too many tabs open. Close one mentally.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f2",
    type: "funny",
    text: "Congratulations. You have been staring at a screen long enough to need this button.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f3",
    type: "funny",
    text: "Error 429: Too Many Thoughts. Retrying in 15 seconds.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f4",
    type: "funny",
    text: "It compiles on my machine. And that's enough for now.",
    moodTag: "funny",
    durationSeconds: 15,
  },
  {
    id: "f5",
    type: "funny",
    text: "Have you tried turning yourself off and on again?",
    moodTag: "funny",
    durationSeconds: 15,
  },
  // focus — prompts
  {
    id: "p1",
    type: "prompt",
    text: "Name one thing that went okay today.",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p2",
    type: "prompt",
    text: "What is the single next action you need to take?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p3",
    type: "prompt",
    text: "What would done look like for this task?",
    moodTag: "focus",
    durationSeconds: 15,
  },
  {
    id: "p4",
    type: "prompt",
    text: "Name the one thing that matters most right now.",
    moodTag: "focus",
    durationSeconds: 15,
  },
  // energy — game + physical
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
    text: "Roll your shoulders back three times. Go.",
    moodTag: "energy",
    durationSeconds: 15,
  },
  {
    id: "q6",
    type: "quote",
    text: "Stand up, stretch your arms overhead, sit back down. Done.",
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
