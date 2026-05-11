"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postCommentAction } from "../actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
  comments: CourseComment[]
  currentUserId: string
}

export function CourseChat({ courseId, comments, currentUserId }: Props) {
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [comments])

  function handleSubmit() {
    if (!body.trim() || isPending) return

    startTransition(async () => {
      await postCommentAction(courseId, body)
      setBody("")
    })
  }

  function getInitials(name?: string) {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm border-l border-border-icy">
      <div className="p-4 border-b border-border-icy bg-primary/5">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Internal Discussion</h3>
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1">Reviewer and Admin Channel</p>
      </div>

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-6">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
              <MessageSquare className="size-8 mb-2 text-primary/40" />
              <p className="text-xs font-bold uppercase tracking-widest">No conversation yet</p>
            </div>
          )}
          {comments.map((comment) => {
            const isMe = comment.author_id === currentUserId
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex gap-3 max-w-[90%]",
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <Avatar className={cn(
                  "size-8 shrink-0 mt-1 border",
                  isMe ? "border-primary/30" : "border-border-icy"
                )}>
                  <AvatarFallback className={cn(
                    "text-[10px] font-black",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {getInitials(comment.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("space-y-1.5", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70">
                      {comment.author_name}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none ring-1 ring-primary/20"
                        : "bg-background/80 text-foreground border border-border-icy rounded-tl-none backdrop-blur-md"
                    )}
                  >
                    {comment.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border-icy bg-primary/5">
        <div className="relative group">
          <Textarea
            placeholder="Type a message..."
            className="min-h-[100px] resize-none pr-12 pb-12 bg-background/50 border-border-icy focus:border-primary/50 transition-all rounded-xl"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase hidden sm:block">Press Enter to send</p>
            <Button
              size="icon"
              disabled={!body.trim() || isPending}
              onClick={handleSubmit}
              className="size-9 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
