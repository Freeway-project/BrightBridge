import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import type { Role } from "@coursebridge/workflow"
import { getAuthContext } from "@/lib/auth/context"
import {
  EXTRACTION_PROMPT,
  buildBrightspaceHTML,
  buildCustomPrompt,
  buildTemplatePrompt,
  isConverterTemplate,
  type ConverterTemplate,
  type SyllabusData,
} from "@/lib/content-converter/templates"

export const runtime = "nodejs"
// Large syllabi extract to a lot of JSON, and we now stream the response so the
// generation can run for several minutes without the connection going idle.
// Give the route plenty of headroom before it self-aborts.
export const maxDuration = 600

const CLAUDE_MODEL = "claude-sonnet-4-6"

// The Anthropic API always requires a max_tokens ceiling — there is no
// "unlimited" value. 16k was too low: a full-length syllabus pasted as text
// extracts to >16k output tokens, so the JSON was being truncated mid-object
// and surfaced to the user as the misleading "Could not parse JSON from Claude".
// 64k is Sonnet 4.6's streaming ceiling; callClaude streams (below) so a
// generation this large doesn't trip the route/proxy idle timeout.
const MAX_OUTPUT_TOKENS = 64000

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
  /** For the "custom" template: the user-supplied HTML format to fill. */
  customHtml?: string
}

type ClaudeResult = { text: string; stopReason: string | null }

async function callClaude(
  apiKey: string,
  messages: unknown[],
  maxTokens: number,
): Promise<ClaudeResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    // This is a PDF/Word -> structured-output extraction task, not a reasoning
    // task. Disable thinking and use low effort so latency and cost stay close
    // to the prior (non-thinking) Sonnet 4 behavior — Sonnet 4.6 otherwise
    // defaults to adaptive thinking at high effort. We stream so a large
    // extraction (up to MAX_OUTPUT_TOKENS) keeps the connection alive instead
    // of idling out on a multi-minute non-streaming request.
    //
    // NOTE: We do NOT use `output_config.format` (structured outputs) for the
    // syllabus schema. It is large/nested enough that Anthropic's structured-
    // output grammar compiler rejects it ("The compiled grammar is too large"),
    // which 400s every syllabus request. We instead ask for JSON in the prompt
    // and parse it tolerantly in extractHtml().
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      stream: true,
      messages,
    }),
  })

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message || `Anthropic API error ${res.status}`)
  }

  // Parse the SSE stream: accumulate text_delta chunks and capture the final
  // stop_reason from the message_delta event.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let text = ""
  let stopReason: string | null = null

  const handleData = (payload: string) => {
    let evt: {
      type?: string
      delta?: { type?: string; text?: string; stop_reason?: string }
      error?: { message?: string }
    }
    try {
      evt = JSON.parse(payload)
    } catch {
      return
    }
    if (evt.type === "error") {
      throw new Error(evt.error?.message || "Anthropic streaming error")
    }
    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
      text += evt.delta.text || ""
    } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
      stopReason = evt.delta.stop_reason
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE events are separated by a blank line; each event has one `data:` line.
    let nl
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line.startsWith("data:")) handleData(line.slice(5).trim())
    }
  }

  return { text, stopReason }
}

function buildMessages(
  template: ConverterTemplate,
  extra: string,
  kind: "pdf" | "text",
  data: string | undefined,
  text: string | undefined,
  customHtml: string | undefined,
): unknown[] {
  const extraNote = extra ? "\n\nExtra instructions: " + extra : ""
  let basePrompt: string
  if (template === "syllabus") basePrompt = EXTRACTION_PROMPT
  else if (template === "custom") basePrompt = buildCustomPrompt(customHtml || "")
  else basePrompt = buildTemplatePrompt(template)
  const prompt = basePrompt + extraNote

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
    // The prompt asks for pure JSON, but the model occasionally wraps it in prose
    // ("Here is the extracted data: { ... }"). Narrow to the outermost JSON object
    // so a stray preamble/epilogue doesn't fail the parse.
    const firstBrace = clean.indexOf("{")
    const lastBrace = clean.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1)
    }
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
  if (template === "custom" && !body.customHtml?.trim()) {
    return NextResponse.json({ error: "Missing custom HTML template" }, { status: 400 })
  }

  const started = performance.now()
  try {
    const messages = buildMessages(template, extra, kind, body.data, body.text, body.customHtml)
    const { text: response, stopReason } = await callClaude(apiKey, messages, MAX_OUTPUT_TOKENS)
    // A max_tokens stop means the output was cut off mid-document — the JSON is
    // incomplete by definition. Report that clearly instead of letting it fall
    // through to a misleading "Could not parse JSON from Claude".
    if (stopReason === "max_tokens") {
      throw new Error("Document is too long to convert in one pass — try splitting it into smaller sections.")
    }
    const html = extractHtml(template, response)
    logUsage({ userId, role, template, kind, outcome: "success", ms: Math.round(performance.now() - started) })
    return NextResponse.json({ html })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Conversion failed"
    const ms = Math.round(performance.now() - started)
    logUsage({ userId, role, template, kind, outcome: "error", ms, detail: message })
    // Report to Sentry so conversion failures (e.g. "Could not parse JSON from
    // Claude") are tracked with enough context to debug — never the document
    // contents, extracted text, or generated HTML.
    Sentry.withScope((scope) => {
      scope.setTag("area", "content_converter")
      scope.setTag("template", template)
      scope.setTag("kind", kind)
      scope.setContext("content_converter", { actorId: userId, actorRole: role, ms })
      Sentry.captureException(e instanceof Error ? e : new Error(message))
    })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
