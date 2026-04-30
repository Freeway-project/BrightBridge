"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postCommentAction } from "../actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Internal Discussion</h3>
        <p className="text-xs text-muted-foreground">Chat with TAs and other admins</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {comments.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              No comments yet. Start the conversation!
            </p>
          )}
          {comments.map((comment) => {
            const isMe = comment.author_id === currentUserId
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex gap-2 max-w-[85%]",
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <Avatar className="size-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(comment.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("space-y-1", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {comment.author_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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

      <div className="p-4 border-t bg-card">
        <div className="relative">
          <Textarea
            placeholder="Type a message..."
            className="min-h-[80px] resize-none pr-12 pb-10"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              size="icon"
              disabled={!body.trim() || isPending}
              onClick={handleSubmit}
              className="size-8"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
