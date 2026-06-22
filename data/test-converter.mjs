/**
 * Local test: run each syllabus file through the same Anthropic call + JSON fix
 * that /api/content-converter uses, and report pass / fail per file.
 *
 * Usage: node data/test-converter.mjs
 */

import { readFileSync, readdirSync } from "node:fs"
import { join, extname, basename } from "node:path"
import { execSync } from "node:child_process"

const DATA_DIR = new URL(".", import.meta.url).pathname
const ENV_FILE = join(new URL("../", import.meta.url).pathname, ".env.prod")
const API_KEY  = readFileSync(ENV_FILE, "utf8").match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) { console.error("ANTHROPIC_API_KEY not found in .env.prod"); process.exit(1) }
const MODEL    = "claude-sonnet-4-6"
const MAX_TOKENS = 64000

const EXTRACTION_PROMPT = `You are extracting structured data from a course syllabus. Return ONLY a valid JSON object -- no markdown fences, no explanation, nothing else before or after the JSON.

IMPORTANT: Extract ALL content from the document. Do not summarise, condense, skip, or omit any information. Every piece of content in the document must be captured in the JSON.

Extract the following fields. Use null for anything not found. All HTML in body fields must use only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href="...">, <table>, <tbody>, <tr>, <td>, <br>. Use &amp; for & in table cells.

{
  "courseCode": "e.g. BIOL 131",
  "courseTitle": "e.g. Human Anatomy and Physiology I",
  "term": "e.g. Fall 2025",
  "description": "Full calendar/course description as plain text.",
  "instructor": { "name": null, "email": null, "officeHours": null, "officeLocation": null, "section": null, "campus": null },
  "schedule": { "days": null, "times": null, "room": null, "deliveryFormat": null, "creditHours": null, "prerequisites": null },
  "materials": [],
  "outcomes": [],
  "classSchedule": { "title": null, "columns": [], "rows": [] },
  "evaluation": { "items": [], "notes": null },
  "policies": [ { "title": "Policy name", "bodyHTML": "<p>Policy text</p>" } ],
  "transferInfo": null,
  "pdfFilename": null
}

Include ALL policies found: attendance, academic integrity, AI/generative AI, misconduct, passing grade requirements, disability services, etc.`

// ── helpers ──────────────────────────────────────────────────────────────────

function extractDocxText(filePath) {
  // DOCX = zip; word/document.xml contains the prose
  const xml = execSync(`unzip -p "${filePath}" word/document.xml 2>/dev/null`).toString()
  return xml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function fileToBase64(filePath) {
  return readFileSync(filePath).toString("base64")
}

// The same sanitisation we ship in route.ts
function sanitiseJson(raw) {
  let clean = raw.trim()
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) clean = fence[1].trim()
  const first = clean.indexOf("{"), last = clean.lastIndexOf("}")
  if (first !== -1 && last > first) clean = clean.slice(first, last + 1)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  // Character-level scanner: fixes literal \n/\r/\t AND unescaped " (e.g. HTML
  // attributes like href="url") inside JSON string values.
  const chars = []
  let inStr = false
  for (let i = 0; i < clean.length; ) {
    const ch = clean[i]
    if (!inStr) {
      chars.push(ch)
      if (ch === '"') inStr = true
      i++
      continue
    }
    if (ch === '\\') { chars.push(ch, clean[i + 1] ?? ''); i += 2; continue }
    if (ch === '"') {
      let j = i + 1
      while (j < clean.length && (clean[j] === ' ' || clean[j] === '\t' || clean[j] === '\n' || clean[j] === '\r')) j++
      const nx = j < clean.length ? clean[j] : ''
      if (nx === ',' || nx === '}' || nx === ']' || nx === ':' || nx === '') {
        chars.push('"'); inStr = false
      } else {
        chars.push('\\"')
      }
      i++; continue
    }
    if (ch === '\n') { chars.push('\\n'); i++; continue }
    if (ch === '\r') { chars.push('\\r'); i++; continue }
    if (ch === '\t') { chars.push('\\t'); i++; continue }
    chars.push(ch); i++
  }
  return chars.join('')
}

async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" },
      stream: true,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API ${res.status}`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = "", text = "", stopReason = null

  const handle = (payload) => {
    let evt
    try { evt = JSON.parse(payload) } catch { return }
    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") text += evt.delta.text || ""
    if (evt.type === "message_delta" && evt.delta?.stop_reason) stopReason = evt.delta.stop_reason
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line.startsWith("data:")) handle(line.slice(5).trim())
    }
  }
  return { text, stopReason }
}

// ── run tests ─────────────────────────────────────────────────────────────────

const files = readdirSync(DATA_DIR).filter(f => /\.(pdf|docx)$/i.test(f))
console.log(`\nTesting ${files.length} files against claude-sonnet-4-6...\n`)

let passed = 0, failed = 0

for (const file of files) {
  const filePath = join(DATA_DIR, file)
  const ext = extname(file).toLowerCase()
  const label = basename(file)
  process.stdout.write(`  ${label.padEnd(45)}`)

  const t0 = Date.now()
  try {
    let messages
    if (ext === ".pdf") {
      const b64 = fileToBase64(filePath)
      messages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      }]
    } else {
      const text = extractDocxText(filePath)
      messages = [{ role: "user", content: EXTRACTION_PROMPT + "\n\n--- DOCUMENT TEXT ---\n\n" + text }]
    }

    const { text: raw, stopReason } = await callClaude(messages)
    const ms = Date.now() - t0

    if (stopReason === "max_tokens") {
      console.log(`TRUNCATED  (${(ms/1000).toFixed(1)}s)  — document too long`)
      failed++
      continue
    }

    const clean = sanitiseJson(raw)
    const parsed = JSON.parse(clean)   // throws if still broken

    const policies = parsed.policies?.length ?? 0
    const outcomes = parsed.outcomes?.length ?? 0
    console.log(`PASS  (${(ms/1000).toFixed(1)}s)  policies=${policies} outcomes=${outcomes}`)
    passed++
  } catch (e) {
    const ms = Date.now() - t0
    console.log(`FAIL  (${(ms/1000).toFixed(1)}s)  ${e.message}`)
    failed++
  }
}

console.log(`\n  ${passed} passed, ${failed} failed\n`)
