"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postSharedCommentAction } from "@/lib/actions/shared-comment-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"

const ROLE_LABELS: Record<string, string> = {
  instructor:    "Instructor",
  admin_full:    "Admin",
  admin_viewer:  "Comms",
  super_admin:   "Admin",
  provost:       "Provost",
  standard_user: "TA",
}

const ROLE_COLORS: Record<string, string> = {
  instructor:    "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  admin_full:    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  admin_viewer:  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  super_admin:   "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  provost:       "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  standard_user: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

interface Props {
  courseId: string
  comments: CourseComment[]
  currentUserId: string
  canPost?: boolean
}

export function CourseDiscussion({ courseId, comments, currentUserId, canPost = true }: Props) {
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [comments])

  function handleSubmit() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      await postSharedCommentAction(courseId, body)
      setBody("")
    })
  }

  function getInitials(name?: string) {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">Shared Discussion</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Visible to instructor, TA, and admin</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="size-7 mb-2 opacity-30" />
              <p className="text-xs font-medium">No messages yet</p>
              <p className="text-[11px] mt-0.5 opacity-60">Start the conversation</p>
            </div>
          )}
          {comments.map((comment) => {
            const isMe = comment.author_id === currentUserId
            // Prefer the author's org-hierarchy title (e.g. "Dean") over the
            // generic platform role so the reader sees who is actually speaking.
            const titleLabel = comment.author_title ? ROLE_TITLE_LABELS[comment.author_title] ?? null : null
            const roleLabel = titleLabel ?? ROLE_LABELS[comment.author_role ?? ""] ?? "Team"
            const roleColor = titleLabel
              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
              : ROLE_COLORS[comment.author_role ?? ""] ?? "bg-muted text-muted-foreground"
            return (
              <div
                key={comment.id}
                className={cn("flex gap-2.5 max-w-[88%]", isMe ? "ml-auto flex-row-reverse" : "")}
              >
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarFallback className={cn("text-[10px] font-bold", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {getInitials(comment.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("space-y-1", isMe ? "items-end flex flex-col" : "")}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {comment.author_name ?? "Unknown"}
                    </span>
                    <span className={cn("rounded-full px-1.5 py-0 text-[10px] font-semibold", roleColor)}>
                      {roleLabel}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground"
                      title={new Date(comment.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    >
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {comment.on_behalf_of_name && (
                    <span className="text-[10px] italic text-muted-foreground">
                      on behalf of {comment.on_behalf_of_name}
                    </span>
                  )}
                  <div className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/60 text-foreground border border-border rounded-tl-none"
                  )}>
                    {comment.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {canPost && (
        <div className="p-3 border-t border-border bg-muted/10">
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a message visible to all parties…"
              className="min-h-[70px] resize-none text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <Button
              size="icon"
              className="self-end shrink-0"
              disabled={!body.trim() || isPending}
              onClick={handleSubmit}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
