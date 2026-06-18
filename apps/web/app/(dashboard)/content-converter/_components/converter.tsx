"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useCallback, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_LABELS,
  type ConverterTemplate,
} from "@/lib/content-converter/templates.shared"
import { Check, CheckCircle2, Copy, Download, FileText, Sparkles, UploadCloud } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GiphyLoader } from "./giphy-loader"

const MAMMOTH_CDN = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
const JSZIP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
const PDFJS_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

// Hard ceiling for a single upload. PDFs travel to the API base64-inlined in a
// JSON body (~33% larger than the file on the wire), so anything much bigger
// risks a gateway 413 / timeout — we stop it here with a friendly message.
const MAX_FILE_MB = 25

// How each extension is turned into something the API understands.
//   pdf  → text extracted in-browser via pdf.js (falls back to a native PDF
//          document block only when the PDF has no selectable text, e.g. scans)
//   docx → text extracted in-browser via mammoth
//   pptx → slide text extracted in-browser via JSZip
//   text → read directly with File.text()
const PDF_EXTS = ["pdf"]
const DOCX_EXTS = ["docx"]
const PPTX_EXTS = ["pptx"]
const TEXT_EXTS = ["txt", "md", "markdown", "text", "html", "htm", "csv", "tsv", "rtf", "json"]
const SUPPORTED_EXTS = [...PDF_EXTS, ...DOCX_EXTS, ...PPTX_EXTS, ...TEXT_EXTS]
const ACCEPTED = SUPPORTED_EXTS.map((e) => "." + e)
const TEMPLATE_ORDER: ConverterTemplate[] = [
  "syllabus",
  "introduction",
  "content",
  "video",
  "discussion",
  "assignment",
  "quiz",
  "conclusion",
]

type LogType = "info" | "ok" | "err"
type LogLine = { type: LogType; msg: string; time: string }
type OutputTab = "preview" | "code"

function fmtBytes(b: number): string {
  if (b < 1024) return b + " B"
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB"
  return (b / 1048576).toFixed(1) + " MB"
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(",")[1])
    r.onerror = () => reject(new Error("File read failed"))
    r.readAsDataURL(file)
  })
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement("script")
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Script load failed: " + src))
    document.head.appendChild(s)
  })
}

// mammoth is loaded from a CDN at runtime; this is the minimal shape we use.
type Mammoth = {
  extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  convertToHtml: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
}
async function extractDocxText(file: File): Promise<string> {
  await loadScript(MAMMOTH_CDN)
  const mammoth = (window as unknown as { mammoth?: Mammoth }).mammoth
  if (!mammoth) throw new Error("Could not load the Word document reader")
  const buf = await file.arrayBuffer()
  // Convert to semantic HTML instead of raw text: this preserves headings,
  // lists, tables, and bold/italic so Claude sees the document's structure.
  // Raw-text extraction flattens tables (e.g. a syllabus schedule/evaluation
  // grid) into an unreadable run of words, which badly hurts extraction quality.
  const result = await mammoth.convertToHtml({ arrayBuffer: buf })
  // mammoth base64-inlines images by default; strip them — we only need the
  // text structure, and data URIs would bloat the request to the model.
  const html = result.value.replace(/<img[^>]*>/gi, "").trim()
  if (html) return html
  // Fallback: if HTML conversion produced nothing, use plain raw text.
  const raw = await mammoth.extractRawText({ arrayBuffer: buf })
  return raw.value
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}

// JSZip is loaded from a CDN at runtime; this is the minimal shape we use.
type JSZipFile = { async: (type: "string") => Promise<string> }
type JSZipInstance = { file: (path: string) => JSZipFile | null; files: Record<string, unknown> }
type JSZipStatic = { loadAsync: (data: ArrayBuffer) => Promise<JSZipInstance> }
async function extractPptxText(file: File): Promise<string> {
  await loadScript(JSZIP_CDN)
  const JSZip = (window as unknown as { JSZip?: JSZipStatic }).JSZip
  if (!JSZip) throw new Error("Could not load the PowerPoint reader")
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  // Slides live at ppt/slides/slide1.xml, slide2.xml, … — read them in order.
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort(
      (a, b) =>
        Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0),
    )
  const slides: string[] = []
  for (const path of slidePaths) {
    const xml = await zip.file(path)?.async("string")
    if (!xml) continue
    // Visible text sits in <a:t>…</a:t> runs.
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]))
    if (runs.length) slides.push(runs.join(" "))
  }
  return slides.join("\n\n")
}

// pdf.js is loaded from a CDN at runtime; this is the minimal shape we use.
type PdfTextItem = { str?: string }
type PdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> }
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> }
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> }
}

// Extract selectable text from a PDF in the browser. Returns "" for scanned /
// image-only PDFs (no text layer) so the caller can fall back to native PDF
// reading. Parsing here keeps the raw PDF out of the model request — cheaper and
// faster than shipping a base64 document block.
async function extractPdfText(file: File): Promise<string> {
  await loadScript(PDFJS_CDN)
  const pdfjsLib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib
  if (!pdfjsLib) throw new Error("Could not load the PDF reader")
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((it) => it.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
    if (line) pages.push(line)
  }
  return pages.join("\n\n")
}

// Very light RTF → text: drop control words/groups so Claude sees the prose.
function stripRtf(s: string): string {
  return s
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r/g, "")
    .trim()
}

async function extractTextFile(file: File, ext: string): Promise<string> {
  const raw = await file.text()
  return ext === "rtf" ? stripRtf(raw) : raw
}

export function ContentConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [template, setTemplate] = useState<ConverterTemplate>("syllabus")
  const [extra, setExtra] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogLine[]>([{ type: "info", msg: "Waiting for upload…", time: "" }])
  const [html, setHtml] = useState("")
  const [tab, setTab] = useState<OutputTab>("preview")
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const log = useCallback((type: LogType, msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setLogs((prev) => [...prev, { type, msg, time }])
  }, [])

  const handleFile = useCallback(
    (f: File) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
      if (ext === "doc") {
        log("err", "Legacy .doc isn't supported — please re-save it as .docx or PDF and try again.")
        return
      }
      if (!SUPPORTED_EXTS.includes(ext)) {
        log(
          "err",
          "Unsupported file type. Upload a PDF, Word (.docx), PowerPoint (.pptx), or a text file (.txt, .md, .html, .csv, .rtf).",
        )
        return
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        log(
          "err",
          `That file is ${fmtBytes(f.size)} — please keep uploads under ${MAX_FILE_MB} MB` +
            (ext === "pdf" ? " (try exporting fewer pages or compressing the PDF)." : "."),
        )
        return
      }
      setFile(f)
      log("ok", "Loaded: " + f.name)
    },
    [log],
  )

  const convert = useCallback(async () => {
    if (!file || busy) return
    setBusy(true)
    setProgress(5)
    setHtml("")
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      let payload: Record<string, unknown>

      if (ext === "pdf") {
        // Parse the PDF to text in the browser instead of shipping the raw PDF
        // to the model. Only fall back to the native PDF path when there's no
        // selectable text (scanned/image-only), so Claude can still read it.
        log("info", "Extracting PDF text…")
        const text = await extractPdfText(file)
        if (text.trim()) {
          setProgress(20)
          payload = { template, extra, kind: "text", text }
        } else {
          log("info", "No selectable text found — sending the PDF for visual reading…")
          const data = await fileToBase64(file)
          setProgress(20)
          payload = { template, extra, kind: "pdf", data }
        }
      } else {
        let text: string
        if (DOCX_EXTS.includes(ext)) {
          log("info", "Extracting Word document text…")
          text = await extractDocxText(file)
        } else if (PPTX_EXTS.includes(ext)) {
          log("info", "Extracting PowerPoint text…")
          text = await extractPptxText(file)
        } else {
          log("info", "Reading document text…")
          text = await extractTextFile(file, ext)
        }
        if (!text.trim()) {
          throw new Error(
            "Couldn't find any text in that file. If it's a scanned document, upload it as a PDF instead.",
          )
        }
        setProgress(20)
        payload = { template, extra, kind: "text", text }
      }

      setProgress(40)
      log("info", "Claude is processing…")
      const res = await fetch("/api/content-converter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      // The route always replies with JSON, but a gateway in front (nginx) can
      // return an HTML error page — a 504 on a slow conversion or a 413 on a
      // large upload. Parsing that as JSON throws a cryptic "unexpected token",
      // so read text first and turn non-JSON responses into a clear message.
      const raw = await res.text()
      let json: { html?: string; error?: string }
      try {
        json = raw ? JSON.parse(raw) : {}
      } catch {
        if (res.status === 413) throw new Error("Document is too large to upload. Try a smaller file.")
        if (res.status === 504) throw new Error("Conversion timed out. Try a shorter document or fewer pages.")
        throw new Error(`Server returned an unexpected response (HTTP ${res.status}). Please try again.`)
      }
      if (!res.ok || !json.html) {
        throw new Error(json.error || `Conversion failed (HTTP ${res.status})`)
      }

      setProgress(95)
      setHtml(json.html)
      setTab("preview")
      setProgress(100)
      log("ok", "Done! " + Math.round(json.html.length / 1024) + " KB generated.")
      setTimeout(() => setProgress(0), 1500)
    } catch (e) {
      log("err", e instanceof Error ? e.message : "Conversion failed")
      setProgress(0)
    } finally {
      setBusy(false)
    }
  }, [file, busy, template, extra, log])

  const download = useCallback(() => {
    if (!html) return
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "brightspace-" + template + ".html"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    log("ok", "Downloaded.")
  }, [html, template, log])

  const copy = useCallback(async () => {
    if (!html) return
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      log("ok", "Copied HTML to clipboard.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      log("err", "Could not copy to clipboard.")
    }
  }, [html, log])

  return (
    <div className="space-y-1">
      {progress > 0 && <Progress value={progress} className="h-1" />}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: controls */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                1 · Upload Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  dragOver ? "border-primary bg-primary/10" : "border-primary/40 bg-primary/[0.03] hover:border-primary hover:bg-primary/[0.06]",
                )}
              >
                <UploadCloud className="size-7 text-primary" />
                <div className="text-sm font-medium">Drop your document here</div>
                <div className="text-xs text-muted-foreground">
                  PDF, Word, PowerPoint, or text — .pdf .docx .pptx .txt .md .html .csv .rtf
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0])
                  }}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-emerald-600">{file.name}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtBytes(file.size)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                2 · Template Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={template} onValueChange={(v) => setTemplate(v as ConverterTemplate)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEMPLATE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                {TEMPLATE_DESCRIPTIONS[template]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                3 · Optional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="mb-1.5 block text-xs text-muted-foreground">Extra instructions (optional)</label>
              <Textarea
                rows={3}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="e.g. Focus on the grading section only."
              />
            </CardContent>
          </Card>

          <Button className="w-full gap-2" disabled={!file || busy} onClick={convert}>
            {busy ? <LottieLoader className="size-4 " /> : <Sparkles className="size-4" />}
            {busy ? "Converting…" : "Convert Document"}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-44 min-h-20 overflow-y-auto rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                {logs.map((l, i) => (
                  <div
                    key={i}
                    className={cn(
                      l.type === "ok" && "text-emerald-600",
                      l.type === "err" && "text-destructive",
                      l.type === "info" && "text-sky-500",
                    )}
                  >
                    {l.time ? `[${l.time}] ` : ""}
                    {l.msg}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: output */}
        <Card className="flex min-h-[60vh] flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b">
            <CardTitle className="flex-1 text-base font-normal text-muted-foreground">Output</CardTitle>
            <div className="flex gap-1 rounded-md bg-muted p-1">
              <button
                onClick={() => setTab("preview")}
                className={cn(
                  "rounded px-3 py-1 font-mono text-xs transition-colors",
                  tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Preview
              </button>
              <button
                onClick={() => setTab("code")}
                className={cn(
                  "rounded px-3 py-1 font-mono text-xs transition-colors",
                  tab === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                HTML
              </button>
            </div>
            {html && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy HTML"}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
                  <Download className="size-3.5" />
                  Download HTML
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="relative flex-1 p-0">
            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm"
                >
                  <GiphyLoader />
                </motion.div>
              )}
            </AnimatePresence>

            {!html ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <FileText className="size-12 opacity-40" />
                <p className="max-w-xs text-center text-sm">
                  Your Brightspace-ready HTML page will appear here after conversion.
                </p>
              </div>
            ) : tab === "preview" ? (
              <iframe
                title="Preview"
                srcDoc={html}
                sandbox="allow-scripts allow-popups"
                className="size-full border-0 bg-white"
              />
            ) : (
              <pre className="size-full overflow-auto bg-[#110609] p-5 font-mono text-xs leading-relaxed text-[#e8d5de]">
                {html}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
