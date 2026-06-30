"use client"

import { useActionState, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Info, AlertTriangle, OctagonAlert, Megaphone, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { publishAnnouncementAction, clearAnnouncementAction, type AnnouncementState } from "@/app/(dashboard)/super-admin/actions"
import type { CurrentAnnouncement, AnnouncementSeverity } from "@/lib/announcements/types"

const SEVERITY_OPTIONS: { value: AnnouncementSeverity; label: string; icon: React.ReactNode; colors: string }[] = [
  {
    value: "info",
    label: "Info",
    icon: <Info className="size-3.5" />,
    colors: "bg-blue-500/10 border-blue-500/40 text-blue-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:border-blue-400",
  },
  {
    value: "warning",
    label: "Warning",
    icon: <AlertTriangle className="size-3.5" />,
    colors: "bg-amber-500/10 border-amber-500/40 text-amber-400 data-[selected=true]:bg-amber-500/20 data-[selected=true]:border-amber-400",
  },
  {
    value: "critical",
    label: "Critical",
    icon: <OctagonAlert className="size-3.5" />,
    colors: "bg-red-500/10 border-red-500/40 text-red-400 data-[selected=true]:bg-red-500/20 data-[selected=true]:border-red-400",
  },
]

const IDLE: AnnouncementState = { kind: "idle", message: null }

export function AnnouncementPanel({ initial }: { initial: CurrentAnnouncement | null }) {
  const [message, setMessage] = useState(initial?.message ?? "")
  const [severity, setSeverity] = useState<AnnouncementSeverity>(initial?.severity ?? "info")
  const [publishState, publishAction] = useActionState(publishAnnouncementAction, IDLE)
  const [clearState, setClearState] = useState<AnnouncementState>(IDLE)
  const [clearing, startClearing] = useTransition()

  const charsLeft = 280 - message.length

  function handleClear() {
    startClearing(async () => {
      const result = await clearAnnouncementAction()
      setClearState(result)
      if (result.kind === "success") {
        setMessage("")
        setSeverity("info")
      }
    })
  }

  const actionMessage = publishState.message ?? clearState.message
  const actionKind = publishState.kind !== "idle" ? publishState.kind : clearState.kind

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Sidebar Announcement</CardTitle>
          </div>
          {initial?.isActive ? (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] font-black uppercase tracking-widest">
              Live
            </Badge>
          ) : initial ? (
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Draft
            </Badge>
          ) : null}
        </div>
        <CardDescription className="text-xs">
          Broadcasts a banner to all users in the left sidebar. Editing re-shows it for users who dismissed it.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Severity picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Severity
          </label>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-selected={severity === opt.value}
                onClick={() => setSeverity(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all",
                  opt.colors,
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Message
            </label>
            <span className={cn("text-[10px] tabular-nums", charsLeft < 20 ? "text-red-400" : "text-muted-foreground/40")}>
              {charsLeft} left
            </span>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Supabase is experiencing downtime. Some features may be unavailable."
            className="min-h-[80px] resize-none text-sm"
            maxLength={280}
          />
        </div>

        {/* Feedback */}
        {actionMessage && (
          <p className={cn("text-xs font-medium", actionKind === "error" ? "text-red-400" : "text-green-400")}>
            {actionMessage}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <form action={publishAction} className="contents">
            <input type="hidden" name="message" value={message} />
            <input type="hidden" name="severity" value={severity} />
            <input type="hidden" name="is_active" value="true" />
            <Button type="submit" size="sm" className="text-xs" disabled={!message.trim()}>
              Publish
            </Button>
          </form>

          <form action={publishAction} className="contents">
            <input type="hidden" name="message" value={message} />
            <input type="hidden" name="severity" value={severity} />
            <input type="hidden" name="is_active" value="false" />
            <Button type="submit" size="sm" variant="outline" className="text-xs" disabled={!message.trim()}>
              Save Draft
            </Button>
          </form>

          {initial && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
              onClick={handleClear}
              disabled={clearing}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
