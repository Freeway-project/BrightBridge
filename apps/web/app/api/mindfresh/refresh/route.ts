import { NextResponse } from "next/server"
import type { CheckInMood, MindFreshMode } from "@/components/mindfresh/types"

type RefreshRequest = {
  mode?: MindFreshMode
  mood?: CheckInMood | null
  category?: "quote" | "funny" | "prompt"
  celebrationContext?: string
}

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

function buildPrompt(mode: MindFreshMode, mood: CheckInMood | null, category: "quote" | "funny" | "prompt", celebrationContext?: string) {
  if (celebrationContext) {
    const styles = [
      "dry and deadpan, like a tired coworker who is genuinely impressed",
      "overly dramatic like a sports commentator calling a historic moment",
      "absurdly calm, like nothing is a big deal but secretly it is",
      "like a hype person who just saw something incredible",
      "like a proud parent who is trying to stay cool about it",
    ]
    const style = styles[Math.floor(Math.random() * styles.length)]
    return [
      `Write one short, funny, celebratory line for this moment: ${celebrationContext}.`,
      `Tone: ${style}.`,
      "Constraints:",
      "- One line only. Max 12 words.",
      "- No hashtags, no emojis, no quote marks.",
      "- No corporate speak. No 'well done' or 'great job'.",
      "- Make it feel human and specific to the context.",
    ].join("\n")
  }

  const styleByCategory: Record<"quote" | "funny" | "prompt", string> = {
    quote: "grounding, casual, relatable to someone under 25 — not therapy-speak, not motivational poster",
    funny: "genuinely funny to someone under 25 — relatable life humor, no tech or coding jokes, no cringe",
    prompt: "honest self-reflection question for someone under 25 — direct, not corporate, not preachy",
  }

  return [
    "You write 15-second mental reset lines for people under 25.",
    "Constraints:",
    "- Output exactly one short line.",
    "- Max 15 words.",
    "- No hashtags, no emojis, no quote marks.",
    "- Casual tone. Not therapy language. Not motivational poster language.",
    "- No references to coding, tech, or computers.",
    `Mode: ${mode}.`,
    `Selected mood check-in: ${mood ?? "unknown"}.`,
    `Requested category: ${category} (${styleByCategory[category]}).`,
  ].join("\n")
}

function sanitizeLine(input: string | undefined): string | null {
  if (!input) {
    return null
  }

  const cleaned = input.replace(/[\r\n]+/g, " ").trim().replace(/^['"`]+|['"`]+$/g, "")
  if (!cleaned) {
    return null
  }

  return cleaned.slice(0, 200)
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 })
  }

  let body: RefreshRequest
  try {
    body = (await request.json()) as RefreshRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const mode = body.mode ?? "random"
  const mood = body.mood ?? null
  const category = body.category ?? "quote"
  const celebrationContext = body.celebrationContext

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.95,
        max_tokens: 40,
        messages: [
          {
            role: "system",
            content: "Return only one concise line.",
          },
          {
            role: "user",
            content: buildPrompt(mode, mood, category, celebrationContext),
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Groq request failed", details: errorText }, { status: 502 })
    }

    const json = (await response.json()) as GroqResponse
    const text = sanitizeLine(json.choices?.[0]?.message?.content)

    if (!text) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 })
    }

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: "Failed to generate refresh line" }, { status: 500 })
  }
}
