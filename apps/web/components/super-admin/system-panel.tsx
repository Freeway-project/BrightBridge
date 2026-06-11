"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LogEntry = { ts: number; level: "info" | "warn" | "error" | "debug"; msg: string }

type Snapshot = {
  snapshotTs: number
  process: { memoryRssBytes: number; cpuSeconds: number; startEpochSec: number }
  http: { requestsTotal: number; errorsTotal: number }
  db: { poolTotal: number; poolIdle: number; poolWaiting: number }
  courses: Record<string, number>
  auth: { oidcOutcomes: Record<string, number> }
  recentLogs: LogEntry[]
}

function formatBytes(n: number): string {
  if (!n) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

function formatUptime(startEpochSec: number): string {
  if (!startEpochSec) return "—"
  const secs = Math.max(0, Math.floor(Date.now() / 1000 - startEpochSec))
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function levelColor(level: LogEntry["level"]): string {
  switch (level) {
    case "error":
      return "text-red-500"
    case "warn":
      return "text-yellow-500"
    case "debug":
      return "text-muted-foreground"
    default:
      return "text-foreground"
  }
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export function SystemPanel() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [snapErr, setSnapErr] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [streamErr, setStreamErr] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchSnap() {
      try {
        const res = await fetch("/api/super-admin/system", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as Snapshot
        if (!cancelled) {
          setSnap(json)
          setSnapErr(null)
        }
      } catch (err) {
        if (!cancelled) setSnapErr(err instanceof Error ? err.message : String(err))
      }
    }
    fetchSnap()
    const id = setInterval(fetchSnap, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const es = new EventSource("/api/super-admin/system/logs")
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry
        setLogs((prev) => {
          const next = [...prev, entry]
          return next.length > 300 ? next.slice(-300) : next
        })
      } catch {
        // ignore parse errors
      }
    }
    es.onerror = () => {
      setStreamErr("Log stream disconnected — retrying…")
    }
    es.onopen = () => setStreamErr(null)
    return () => es.close()
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const courseSum = snap ? Object.values(snap.courses).reduce((a, b) => a + b, 0) : 0
  const errorPct = snap && snap.http.requestsTotal > 0
    ? ((snap.http.errorsTotal / snap.http.requestsTotal) * 100).toFixed(2) + "%"
    : "0%"

  return (
    <div className="flex flex-col gap-4">
      {snapErr && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          Failed to load KPIs: {snapErr}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Uptime" value={snap ? formatUptime(snap.process.startEpochSec) : "—"} />
        <Kpi label="Memory RSS" value={snap ? formatBytes(snap.process.memoryRssBytes) : "—"} />
        <Kpi
          label="DB Pool"
          value={snap ? `${snap.db.poolTotal}` : "—"}
          sub={snap ? `${snap.db.poolIdle} idle · ${snap.db.poolWaiting} waiting` : undefined}
        />
        <Kpi
          label="HTTP Requests"
          value={snap ? snap.http.requestsTotal.toLocaleString() : "—"}
          sub={snap ? `${snap.http.errorsTotal} 5xx` : undefined}
        />
        <Kpi label="Error Rate" value={snap ? errorPct : "—"} />
        <Kpi
          label="Courses"
          value={snap ? courseSum.toLocaleString() : "—"}
          sub={snap ? Object.entries(snap.courses).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ") : undefined}
        />
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Live Logs
          </CardTitle>
          {streamErr && <span className="text-[10px] text-yellow-500">{streamErr}</span>}
        </CardHeader>
        <CardContent>
          <div
            ref={logRef}
            className="h-[420px] overflow-y-auto rounded-md border border-border/40 bg-black/80 p-3 font-mono text-xs leading-relaxed"
          >
            {logs.length === 0 && (
              <div className="text-muted-foreground">Waiting for log lines…</div>
            )}
            {logs.map((l, i) => (
              <div key={`${l.ts}-${i}`} className={levelColor(l.level)}>
                <span className="text-muted-foreground/60">
                  {new Date(l.ts).toISOString().slice(11, 23)}
                </span>{" "}
                <span className="font-bold uppercase">{l.level}</span>{" "}
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
