"use client"

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
} from "@/lib/content-converter/templates"
import { Check, CheckCircle2, Copy, Download, FileText, Loader2, Sparkles, UploadCloud } from "lucide-react"

const MAMMOTH_CDN = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
const ACCEPTED = [".pdf", ".doc", ".docx"]
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
type Mammoth = { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }
async function extractDocxText(file: File): Promise<string> {
  await loadScript(MAMMOTH_CDN)
  const mammoth = (window as unknown as { mammoth?: Mammoth }).mammoth
  if (!mammoth) throw new Error("Could not load the Word document reader")
  const buf = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
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
      if (!["pdf", "doc", "docx"].includes(ext)) {
        log("err", "Please upload a PDF or Word (.docx) file.")
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
        const data = await fileToBase64(file)
        setProgress(20)
        log("info", "Uploading PDF…")
        payload = { template, extra, kind: "pdf", data }
      } else {
        log("info", "Extracting Word document text…")
        const text = await extractDocxText(file)
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
      const json = (await res.json()) as { html?: string; error?: string }
      if (!res.ok || !json.html) {
        throw new Error(json.error || "Conversion failed")
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
                <div className="text-xs text-muted-foreground">PDF or Word document (.docx)</div>
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
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
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
