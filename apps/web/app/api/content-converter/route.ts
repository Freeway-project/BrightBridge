import { NextResponse } from "next/server"
import type { Role } from "@coursebridge/workflow"
import { getAuthContext } from "@/lib/auth/context"
import {
  EXTRACTION_PROMPT,
  buildBrightspaceHTML,
  buildTemplatePrompt,
  isConverterTemplate,
  type ConverterTemplate,
  type SyllabusData,
} from "@/lib/content-converter/templates"

export const runtime = "nodejs"
// Large PDFs/decks can take a while for Claude to read end-to-end on a
// non-streaming request; give the route headroom before it self-aborts.
export const maxDuration = 300

const CLAUDE_MODEL = "claude-sonnet-4-6"

// The Anthropic API always requires a max_tokens ceiling — there is no
// "unlimited" value. We set it high enough that the token cap is never what
// truncates a converted document; in practice the binding limit is this route's
// maxDuration on a non-streaming request. For genuinely huge documents,
// switch callClaude to streaming and raise maxDuration further.
const MAX_OUTPUT_TOKENS = 16000

// Mirror of the page-level guard. The server holds the Anthropic key, so the
// route must independently verify the caller — a logged-out or unauthorized
// request must never be able to spend the key.
const ALLOWED_ROLES: readonly Role[] = ["standard_user", "admin_full", "super_admin"]

// Structured, privacy-respecting usage log. We never log the document contents,
// the extracted text, or the generated HTML — only who ran what and the outcome.
function logUsage(fields: {
  userId: string
  role: string
  template: string
  kind: string
  outcome: "success" | "error"
  ms: number
  detail?: string
}) {
  console.info("[content-converter]", JSON.stringify(fields))
}

type ConvertRequest = {
  template?: string
  extra?: string
  /** "pdf": `data` is base64 PDF bytes. "text": `text` is extracted document text. */
  kind?: "pdf" | "text"
  data?: string
  text?: string
}

type AnthropicContentBlock = { type: string; text?: string }

async function callClaude(
  apiKey: string,
  messages: unknown[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, messages }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message || `Anthropic API error ${res.status}`)
  }

  const json = (await res.json()) as { content?: AnthropicContentBlock[] }
  return (json.content || []).map((b) => b.text || "").join("")
}

function buildMessages(
  template: ConverterTemplate,
  extra: string,
  kind: "pdf" | "text",
  data: string | undefined,
  text: string | undefined,
): unknown[] {
  const extraNote = extra ? "\n\nExtra instructions: " + extra : ""
  const prompt =
    template === "syllabus" ? EXTRACTION_PROMPT + extraNote : buildTemplatePrompt(template) + extraNote

  if (kind === "pdf") {
    return [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
          { type: "text", text: prompt },
        ],
      },
    ]
  }

  return [{ role: "user", content: prompt + "\n\n--- DOCUMENT TEXT ---\n\n" + (text || "") }]
}

function extractHtml(template: ConverterTemplate, response: string): string {
  let output: string

  if (template === "syllabus") {
    let clean = response.trim()
    const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence) clean = fence[1].trim()
    let parsed: SyllabusData
    try {
      parsed = JSON.parse(clean) as SyllabusData
    } catch {
      throw new Error("Could not parse JSON from Claude")
    }
    output = buildBrightspaceHTML(parsed)
  } else {
    output = response.trim()
    const fence = output.match(/```html\s*([\s\S]*?)```/i)
    if (fence) output = fence[1].trim()
  }

  // Replace any lingering references to Moodle with Brightspace.
  return output.replace(/Moodle/g, "Brightspace").replace(/moodle/g, "brightspace")
}

export async function POST(request: Request) {
  // 1. Authenticate and authorize. The Anthropic key lives only on the server,
  //    so we gate every call behind a valid session and an allowed role.
  const auth = await getAuthContext()
  if (auth.kind !== "profile") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!ALLOWED_ROLES.includes(auth.profile.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }
  const userId = auth.userId
  const role = auth.profile.role

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing ANTHROPIC_API_KEY" }, { status: 500 })
  }

  let body: ConvertRequest
  try {
    body = (await request.json()) as ConvertRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { template, extra = "", kind } = body
  if (!isConverterTemplate(template)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 })
  }
  if (kind !== "pdf" && kind !== "text") {
    return NextResponse.json({ error: "Missing or invalid document kind" }, { status: 400 })
  }
  if (kind === "pdf" && !body.data) {
    return NextResponse.json({ error: "Missing PDF data" }, { status: 400 })
  }
  if (kind === "text" && !body.text) {
    return NextResponse.json({ error: "Missing document text" }, { status: 400 })
  }

  const started = performance.now()
  try {
    const messages = buildMessages(template, extra, kind, body.data, body.text)
    const response = await callClaude(apiKey, messages, MAX_OUTPUT_TOKENS)
    const html = extractHtml(template, response)
    logUsage({ userId, role, template, kind, outcome: "success", ms: Math.round(performance.now() - started) })
    return NextResponse.json({ html })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Conversion failed"
    logUsage({ userId, role, template, kind, outcome: "error", ms: Math.round(performance.now() - started), detail: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
