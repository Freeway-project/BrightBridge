export type MindFreshType = "quote" | "funny" | "prompt" | "breathing" | "game"
export type MindFreshMoodTag = "calm" | "funny" | "focus" | "energy"
export type MindFreshMode = "calm" | "funny" | "focus" | "random"

export type MindFreshItem = {
  id: string
  type: MindFreshType
  text: string
  moodTag: MindFreshMoodTag
  durationSeconds: number
}

export type CheckInMood = "overwhelmed" | "neutral" | "good" | "energized"
