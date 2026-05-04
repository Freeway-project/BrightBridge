"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import type { EscalationSeverity } from "@/lib/repositories/contracts"
import {
  createEscalationAction,
  sendEscalationMessageAction,
} from "../escalation-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, CheckCircle2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  courseId: string
  currentUserId: string
  initialEscalations: EscalationWithMessages[]
}

const SEVERITY_STYLES: Record<EscalationSeverity, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-400/30",
  major:    "bg-orange-500/15 text-orange-600 border-orange-400/30",
  minor:    "bg-yellow-500/15 text-yellow-700 border-yellow-400/30",
}

function getInitials(name?: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function EscalationPanel({ courseId, currentUserId, initialEscalations }: Props) {
  const openEscalation = initialEscalations.find((e) => e.status === "open") ?? null

  if (openEscalation) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <EscalationThread
          courseId={courseId}
          currentUserId={currentUserId}
          escalation={openEscalation}
        />
      </div>
    )
  }

  return <EscalationCreateForm courseId={courseId} />
}

function EscalationCreateForm({ courseId }: { courseId: string }) {
  const [severity, setSeverity] = useState<EscalationSeverity>("major")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim() || !message.trim() || isPending) return
    startTransition(async () => {
      await createEscalationAction(courseId, severity, title.trim(), message.trim())
      toast.success("Escalation submitted to admin")
    })
  }

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">Severity</label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as EscalationSeverity)}>
          <SelectTrigger className="h-9 text-[13px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">Issue Title</label>
        <Input
          placeholder="e.g. Broken links in week 3"
          className="h-9 text-[13px] bg-background"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">Message</label>
        <Textarea
          placeholder="Explain the problem to the admin..."
          className="min-h-[100px] resize-none text-[13px] bg-background leading-relaxed"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <Button
        size="sm"
        variant="destructive"
        className="w-full h-10 text-[13px] font-bold gap-2 mt-2 shadow-sm active:scale-[0.98] transition-all"
        disabled={!title.trim() || !message.trim() || isPending}
        onClick={handleSubmit}
      >
        <AlertTriangle className="size-4" />
        {isPending ? "Submitting..." : "Submit to Admin"}
      </Button>
    </div>
  )
}

function EscalationThread({
  courseId,
  currentUserId,
  escalation,
}: {
  courseId: string
  currentUserId: string
  escalation: EscalationWithMessages
}) {
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" })
      }
    }
  }, [escalation.messages])

  function handleSend() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      await sendEscalationMessageAction(courseId, escalation.id, body)
      toast.success("Message sent")
      setBody("")
    })
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-muted/5 flex-1 min-h-0">
      <div className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold shadow-sm shrink-0",
        SEVERITY_STYLES[escalation.severity],
      )}>
        <span className="flex items-center gap-2 truncate text-[12px]">
          <AlertTriangle className="size-4 shrink-0" />
          {escalation.title}
        </span>
        <span className="capitalize px-2 py-0.5 rounded-full bg-background/50 border border-current/20 ml-2 shrink-0">{escalation.severity}</span>
      </div>

      <ScrollArea className="flex-1 min-h-[150px] rounded-lg border border-border bg-background p-3 shadow-inner" ref={scrollRef}>
        <div className="space-y-4">
          {escalation.messages.map((msg) => {
            const isMe = msg.author_id === currentUserId
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}
              >
                <Avatar className="size-7 shrink-0 border border-border shadow-sm">
                  <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">{getInitials(msg.author_name)}</AvatarFallback>
                </Avatar>
                <div className={cn("space-y-1", isMe ? "items-end text-right" : "items-start text-left")}>
                  <p className="text-[10px] font-medium text-muted-foreground/80 px-1">
                    {msg.author_name ?? "Unknown"} • {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                  <div className={cn(
                    "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted/50 text-foreground border border-border/50 rounded-tl-none",
                  )}>
                    {msg.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 shrink-0">
        <Textarea
          placeholder="Type a response..."
          className="min-h-[56px] resize-none text-[13px] flex-1 bg-background border-border/60 focus:border-primary/40 transition-colors"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <Button
          size="icon"
          className="size-10 shrink-0 self-end rounded-full shadow-sm"
          disabled={!body.trim() || isPending}
          onClick={handleSend}
        >
          <Send className="size-4" />
        </Button>
      </div>

      {escalation.status === "resolved" && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-[12px] font-bold text-green-700 dark:text-green-400 shrink-0">
          <CheckCircle2 className="size-4 shrink-0" />
          Escalation Resolved
        </div>
      )}
    </div>
  )
}
