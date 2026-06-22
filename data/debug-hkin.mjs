/**
 * Debug: capture raw Claude output for HKIN 100 and show what's around the parse error.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"

const DATA_DIR = new URL(".", import.meta.url).pathname
const ENV_FILE = join(new URL("../", import.meta.url).pathname, ".env.prod")
const API_KEY  = readFileSync(ENV_FILE, "utf8").match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim()

const EXTRACTION_PROMPT = `You are extracting structured data from a course syllabus. Return ONLY a valid JSON object -- no markdown fences, no explanation, nothing else before or after the JSON.

IMPORTANT: Extract ALL content from the document. Do not summarise, condense, skip, or omit any information. Every piece of content in the document must be captured in the JSON.

Extract the following fields. Use null for anything not found. All HTML in body fields must use only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href="...">, <table>, <tbody>, <tr>, <td>, <br>. Use &amp; for & in table cells.

{
  "courseCode": null, "courseTitle": null, "term": null, "description": null,
  "instructor": { "name": null, "email": null, "officeHours": null, "officeLocation": null, "section": null, "campus": null },
  "schedule": { "days": null, "times": null, "room": null, "deliveryFormat": null, "creditHours": null, "prerequisites": null },
  "materials": [], "outcomes": [],
  "classSchedule": { "title": null, "columns": [], "rows": [] },
  "evaluation": { "items": [], "notes": null },
  "policies": [ { "title": "Policy name", "bodyHTML": "<p>Policy text</p>" } ],
  "transferInfo": null, "pdfFilename": null
}

Include ALL policies found: attendance, academic integrity, AI/generative AI, misconduct, passing grade requirements, disability services, etc.`

async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 64000, thinking: { type: "disabled" }, stream: true, messages }),
  })
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = "", text = ""
  const handle = (p) => {
    let e; try { e = JSON.parse(p) } catch { return }
    if (e.type === "content_block_delta" && e.delta?.type === "text_delta") text += e.delta.text || ""
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1)
      if (line.startsWith("data:")) handle(line.slice(5).trim())
    }
  }
  return text
}

function sanitise(raw) {
  let c = raw.trim()
  const fence = c.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) c = fence[1].trim()
  const f = c.indexOf("{"), l = c.lastIndexOf("}")
  if (f !== -1 && l > f) c = c.slice(f, l + 1)
  c = c.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  c = c.replace(/"((?:[^"\\]|\\.)*)"/gs, (_, content) =>
    '"' + content.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"'
  )
  return c
}

// Test the DOCX via extracted text
const docxPath = join(DATA_DIR, "F25 HKIN 100 Course Outline.docx")
const text = execSync(`unzip -p "${docxPath}" word/document.xml 2>/dev/null`).toString()
  .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const messages = [{ role: "user", content: EXTRACTION_PROMPT + "\n\n--- DOCUMENT TEXT ---\n\n" + text }]

console.log("Calling Claude for HKIN 100 DOCX...")
const raw = await callClaude(messages)
const clean = sanitise(raw)

try {
  JSON.parse(clean)
  console.log("PASS — JSON parsed successfully")
} catch (e) {
  console.log(`FAIL: ${e.message}`)
  // Show 200 chars around the error position
  const pos = parseInt(e.message.match(/position (\d+)/)?.[1] ?? "0")
  console.log(`\n--- context around position ${pos} ---`)
  console.log(JSON.stringify(clean.slice(Math.max(0, pos - 100), pos + 100)))
}
