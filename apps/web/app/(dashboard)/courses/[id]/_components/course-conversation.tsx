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
import { AlertTriangle, Send, MessageSquare } from "lucide-react"
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
  | { type: "escalation"; id: string; date: string; authorName: string; authorId: string; body: string; title: string; severity: string; status: string; messages: EscalationWithMessages["messages"] }

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
    <div className="flex flex-col h-full min-h-0 gap-3">
      <ScrollArea className="flex-1 min-h-[200px] rounded-xl border border-border bg-background p-3 shadow-inner" ref={scrollRef}>
        <div className="space-y-6">
          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
              <MessageSquare className="size-8 mb-2" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-[11px]">Start a discussion or escalate an issue</p>
            </div>
          )}
          {timeline.map((item) => {
            if (item.type === "comment") {
              const isMe = item.authorId === currentUserId
              return (
                <div key={item.id} className={cn("flex gap-2.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                  <Avatar className="size-7 shrink-0 border border-border">
                    <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">{getInitials(item.authorName)}</AvatarFallback>
                  </Avatar>
                  <div className={cn("space-y-1", isMe ? "items-end text-right" : "items-start text-left")}>
                    <p className="text-[10px] font-medium text-muted-foreground/80 px-1">
                      {item.authorName} • {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </p>
                    <div className={cn(
                      "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground border border-border/50 rounded-tl-none"
                    )}>
                      {item.body}
                    </div>
                  </div>
                </div>
              )
            } else {
              return (
                <div key={item.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertTriangle className="size-3.5 text-red-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Escalation: {item.title}
                    </span>
                    <span className={cn(
                      "ml-auto px-1.5 py-0.5 rounded-md border text-[10px] font-bold",
                      item.status === "open"
                        ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  {item.messages.map((msg) => {
                    const isMe = msg.author_id === currentUserId
                    return (
                      <div key={msg.id} className={cn("flex gap-2.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                        <Avatar className="size-7 shrink-0 border border-border">
                          <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">{getInitials(msg.author_name)}</AvatarFallback>
                        </Avatar>
                        <div className={cn("space-y-1", isMe ? "items-end text-right" : "items-start text-left")}>
                          <p className="text-[10px] font-medium text-muted-foreground/80 px-1">
                            {msg.author_name} • {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                          <div className={cn(
                            "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm border",
                            isMe
                              ? "bg-red-500 text-white border-red-600 rounded-tr-none"
                              : "bg-red-900/20 text-foreground border-red-800/30 rounded-tl-none"
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

      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "escalate")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="chat" className="text-[11px] uppercase font-bold tracking-wider">Internal Chat</TabsTrigger>
            <TabsTrigger value="escalate" className="text-[11px] uppercase font-bold tracking-wider">Escalate</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "chat" ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="Internal note for admins/TAs..."
              className="min-h-[60px] resize-none text-[13px] flex-1 bg-background"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment() }
              }}
            />
            <Button
              size="icon"
              className="size-10 shrink-0 self-end rounded-full shadow-sm"
              disabled={!body.trim() || isPending}
              onClick={handleSendComment}
            >
              <Send className="size-4" />
            </Button>
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
