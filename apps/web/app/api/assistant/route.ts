import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/context"
import { canAccessAssistant } from "@/lib/assistant/authz"
import { generateAssistantResponse } from "@/lib/assistant/service"
import type { AssistantMessage } from "@/lib/assistant/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

type RequestBody = {
  messages?: AssistantMessage[]
}

function sanitizeMessages(messages: AssistantMessage[] | undefined): AssistantMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) return null

  const normalized = messages
    .filter((message): message is AssistantMessage => {
      return !!message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string"
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter((message) => message.content.length > 0)

  return normalized.length > 0 ? normalized.slice(-12) : null
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (auth.kind !== "profile") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!canAccessAssistant(auth.profile)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  if (!messages) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 })
  }

  try {
    const result = await generateAssistantResponse({
      profile: auth.profile,
      messages,
    })
    return NextResponse.json(result)
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Assistant request failed"
    return NextResponse.json({ error: "Assistant request failed", detail }, { status: 500 })
  }
}
