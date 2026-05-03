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
      <EscalationThread
        courseId={courseId}
        currentUserId={currentUserId}
        escalation={openEscalation}
      />
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
    })
  }

  return (
    <div className="space-y-3">
      <Select value={severity} onValueChange={(v) => setSeverity(v as EscalationSeverity)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="minor">Minor</SelectItem>
          <SelectItem value="major">Major</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Short title (e.g. Syllabus missing)"
        className="h-8 text-xs"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Textarea
        placeholder="Describe the issue..."
        className="min-h-[80px] resize-none text-xs"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <Button
        size="sm"
        variant="destructive"
        className="w-full h-8 text-xs font-bold gap-1.5"
        disabled={!title.trim() || !message.trim() || isPending}
        onClick={handleSubmit}
      >
        <AlertTriangle className="size-3.5" />
        {isPending ? "Submitting..." : "Submit Escalation"}
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
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [escalation.messages])

  function handleSend() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      await sendEscalationMessageAction(courseId, escalation.id, body)
      setBody("")
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(
        "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] font-semibold",
        SEVERITY_STYLES[escalation.severity],
      )}>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3 shrink-0" />
          {escalation.title}
        </span>
        <span className="capitalize opacity-70">{escalation.severity}</span>
      </div>

      <ScrollArea className="h-[180px] rounded-md border border-border bg-muted/10 p-2" ref={scrollRef}>
        <div className="space-y-3">
          {escalation.messages.map((msg) => {
            const isMe = msg.author_id === currentUserId
            return (
              <div
                key={msg.id}
                className={cn("flex gap-1.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}
              >
                <Avatar className="size-5 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px]">{getInitials(msg.author_name)}</AvatarFallback>
                </Avatar>
                <div className={cn("space-y-0.5", isMe ? "items-end" : "items-start")}>
                  <p className="text-[10px] text-muted-foreground">
                    {msg.author_name ?? "Unknown"} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                  <div className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}>
                    {msg.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-1.5">
        <Textarea
          placeholder="Reply..."
          className="min-h-[52px] resize-none text-xs flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <Button
          size="icon"
          className="size-9 shrink-0 self-end"
          disabled={!body.trim() || isPending}
          onClick={handleSend}
        >
          <Send className="size-3.5" />
        </Button>
      </div>

      {escalation.status === "resolved" && (
        <div className="flex items-center gap-1.5 rounded-md bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 text-[11px] text-green-700">
          <CheckCircle2 className="size-3 shrink-0" />
          Resolved
        </div>
      )}
    </div>
  )
}
