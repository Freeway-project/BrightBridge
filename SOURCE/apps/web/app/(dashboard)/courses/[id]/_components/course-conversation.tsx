"use client"

import { useState, useTransition, useRef, useEffect, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import type { CourseComment } from "@/lib/services/comments"
import {
  createEscalationAction,
} from "../escalation-actions"
import { postCommentAction } from "@/app/(dashboard)/admin/courses/[id]/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Send, MessageSquare, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Props {
  courseId: string
  currentUserId: string
  comments: CourseComment[]
  escalations: EscalationWithMessages[]
}

type TimelineItem =
  | { type: "comment"; id: string; date: string; authorName: string; authorId: string; body: string }
  | { type: "escalation"; id: string; date: string; authorName: string; authorId: string; body: string; title: string; severity: string; status: string; resolved_at: string | null; resolutionNote: string | null; messages: EscalationWithMessages["messages"] }

export function CourseConversation({ courseId, currentUserId, comments, escalations }: Props) {
  const [activeTab, setActiveTab] = useState<"chat" | "escalate">("chat")
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...comments.map(c => ({
        type: "comment" as const,
        id: c.id,
        date: c.created_at,
        authorName: c.author_name ?? "Unknown",
        authorId: c.author_id,
        body: c.body,
      })),
      ...escalations.map(e => ({
        type: "escalation" as const,
        id: e.id,
        date: e.created_at,
        authorName: e.author_name ?? "Unknown",
        authorId: e.created_by,
        body: e.messages[0]?.body ?? "",
        title: e.title,
        severity: e.severity,
        status: e.status,
        resolved_at: e.resolved_at,
        resolutionNote: e.resolutionNote ?? null,
        messages: e.messages,
      })),
    ]
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [comments, escalations])

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" })
      }
    }
  }, [timeline])

  function handleSendComment() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      await postCommentAction(courseId, body.trim())
      setBody("")
      toast.success("Comment posted")
    })
  }

  function getInitials(name?: string) {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <ScrollArea className="flex-1 min-h-[200px] rounded-2xl border border-border-icy bg-background/50 p-4 shadow-inner backdrop-blur-md" ref={scrollRef}>
        <div className="space-y-6">
          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
              <MessageSquare className="size-10 mb-3 text-primary/40" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Audit log empty</p>
            </div>
          )}
          {timeline.map((item) => {
            if (item.type === "comment") {
              const isMe = item.authorId === currentUserId
              return (
                <div key={item.id} className={cn("flex gap-3 max-w-[95%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                  <Avatar className={cn("size-7 shrink-0 border", isMe ? "border-primary/30" : "border-border-icy")}>
                    <AvatarFallback className={cn("text-[10px] font-black", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {getInitials(item.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("space-y-1.5", isMe ? "items-end text-right" : "items-start text-left")}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
                      {item.authorName} • {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </p>
                    <div className={cn(
                      "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm font-medium",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none ring-1 ring-primary/20"
                        : "bg-white/5 text-foreground border border-border-icy rounded-tl-none"
                    )}>
                      {item.body}
                    </div>
                  </div>
                </div>
              )
            } else {
              return (
                <div key={item.id} className="space-y-4 py-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                    <AlertTriangle className="size-3.5 text-destructive animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">
                      Escalation: {item.title}
                    </span>
                    <span className={cn(
                      "ml-auto px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter",
                      item.status === "open"
                        ? "bg-destructive text-destructive-foreground border-destructive/20"
                        : "bg-success text-success-foreground border-success/20"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  {item.status === "resolved" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="size-3.5 text-green-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700">
                        Resolved{item.resolved_at ? ` • ${formatDistanceToNow(new Date(item.resolved_at), { addSuffix: true })}` : ""}
                      </span>
                    </div>
                  )}
                  {item.resolutionNote && (
                    <div className="flex gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/15 text-xs text-green-800">
                      <span className="font-bold shrink-0">Admin note:</span>
                      <span>{item.resolutionNote}</span>
                    </div>
                  )}
                  {item.messages.map((msg) => {
                    const isMe = msg.author_id === currentUserId
                    return (
                      <div key={msg.id} className={cn("flex gap-3 max-w-[95%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                        <Avatar className={cn("size-7 shrink-0 border", isMe ? "border-destructive/30" : "border-border-icy")}>
                          <AvatarFallback className={cn("text-[10px] font-black", isMe ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>
                            {getInitials(msg.author_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("space-y-1.5", isMe ? "items-end text-right" : "items-start text-left")}>
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
                            {msg.author_name} • {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                          <div className={cn(
                            "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm border font-bold",
                            isMe
                              ? "bg-destructive/10 text-foreground border-destructive/30 rounded-tr-none"
                              : "bg-destructive/5 text-foreground border-destructive/20 rounded-tl-none"
                          )}>
                            {msg.body}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          })}
        </div>
      </ScrollArea>

      <div className="space-y-4 p-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "escalate")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9 bg-white/5 border border-border-icy p-1">
            <TabsTrigger value="chat" className="text-[10px] uppercase font-black tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Discussion</TabsTrigger>
            <TabsTrigger value="escalate" className="text-[10px] uppercase font-black tracking-widest data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Escalate</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "chat" ? (
          <div className="flex gap-3 items-end">
            <div className="relative flex-1 group">
              <Textarea
                placeholder="Internal discussion..."
                className="min-h-[80px] resize-none text-[13px] font-medium bg-background/50 border-border-icy focus:border-primary/50 transition-all rounded-xl pr-10"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment() }
                }}
              />
              <div className="absolute right-2 bottom-2">
                 <Button
                    size="icon"
                    className="size-8 rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95"
                    disabled={!body.trim() || isPending}
                    onClick={handleSendComment}
                  >
                    <Send className="size-3.5" />
                  </Button>
              </div>
            </div>
          </div>
        ) : (
          <EscalationCreateForm courseId={courseId} />
        )}
      </div>
    </div>
  )
}

function EscalationCreateForm({ courseId }: { courseId: string }) {
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">("major")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim() || !message.trim() || isPending) return
    startTransition(async () => {
      await createEscalationAction(courseId, severity, title.trim(), message.trim())
      toast.success("Escalation submitted to admin")
      setTitle("")
      setMessage("")
    })
  }

  return (
    <div className="space-y-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5 shadow-sm">
      <div className="flex gap-2">
        <Select value={severity} onValueChange={(v) => setSeverity(v as "minor" | "major" | "critical")}>
          <SelectTrigger className="h-8 text-[11px] w-[100px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Issue Title..."
          className="h-8 text-[11px] bg-background flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <Textarea
        placeholder="Explain the problem to the admin..."
        className="min-h-[60px] resize-none text-[12px] bg-background leading-relaxed"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <Button
        size="sm"
        variant="destructive"
        className="w-full h-8 text-[11px] font-bold gap-2 shadow-sm"
        disabled={!title.trim() || !message.trim() || isPending}
        onClick={handleSubmit}
      >
        <AlertTriangle className="size-3.5" />
        {isPending ? "Submitting..." : "Submit to Admin"}
      </Button>
    </div>
  )
}
