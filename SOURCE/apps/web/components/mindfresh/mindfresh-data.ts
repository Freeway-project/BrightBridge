import type { MindFreshItem, MindFreshMode } from "@/components/mindfresh/types"

export const MINDFRESH_ITEMS: MindFreshItem[] = [
  // calm — AI generates text; template only
  { id: "q-calm", type: "quote",    text: "", moodTag: "calm",  durationSeconds: 15 },

  // calm — breathing (no AI, full instructions needed)
  { id: "b1", type: "breathing", text: "Breathe in for 4, hold for 2, exhale for 6.", moodTag: "calm", durationSeconds: 24 },
  { id: "b2", type: "breathing", text: "Two slow rounds. Follow the blob.",            moodTag: "calm", durationSeconds: 24 },

  // funny — AI generates text; template only
  { id: "f-funny", type: "funny", text: "", moodTag: "funny", durationSeconds: 15 },

  // focus — AI generates text; template only
  { id: "p-focus", type: "prompt", text: "", moodTag: "focus", durationSeconds: 15 },

  // energy — bubble game (no AI)
  { id: "g1", type: "game", text: "Pop all the bubbles to reset your focus.", moodTag: "energy", durationSeconds: 12 },

  // energy — physical cues (no AI, specific instructions)
  { id: "q-e1", type: "quote", text: "Shake your hands out like you're air-drying them. 10 seconds. Go.", moodTag: "energy", durationSeconds: 15 },
  { id: "q-e2", type: "quote", text: "Roll your shoulders back three times. Actually do it.",            moodTag: "energy", durationSeconds: 15 },
  { id: "q-e3", type: "quote", text: "Jaw dropped, shoulders down. Hold it for five seconds.",           moodTag: "energy", durationSeconds: 15 },
  { id: "q-e4", type: "quote", text: "Stand up, stretch your arms up, sit back down. Done.",             moodTag: "energy", durationSeconds: 15 },
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
