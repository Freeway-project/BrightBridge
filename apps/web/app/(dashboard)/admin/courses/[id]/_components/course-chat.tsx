"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postCommentAction } from "../actions"
import { postSharedCommentAction } from "@/lib/actions/shared-comment-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, MessageSquare, Lock, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"

const ROLE_LABELS: Record<string, string> = {
  instructor:    "Instructor",
  admin_full:    "Admin",
  admin_viewer:  "Comms",
  super_admin:   "Admin",
  standard_user: "TA",
}

const ROLE_COLORS: Record<string, string> = {
  instructor:    "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  admin_full:    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  admin_viewer:  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  super_admin:   "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  standard_user: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

interface Props {
  courseId: string
  comments: CourseComment[]
  currentUserId: string
}

export function CourseChat({ courseId, comments, currentUserId }: Props) {
  const [channel, setChannel] = useState<"internal" | "instructor_visible">("internal")
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  const visibleComments = comments.filter((c) => c.visibility === channel)
  const sharedCount = comments.filter((c) => c.visibility === "instructor_visible").length

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [visibleComments])

  function handleSubmit() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      if (channel === "instructor_visible") {
        await postSharedCommentAction(courseId, body)
      } else {
        await postCommentAction(courseId, body)
      }
      setBody("")
    })
  }

  function getInitials(name?: string) {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const isShared = channel === "instructor_visible"

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-0 border-b border-border">
        <Tabs value={channel} onValueChange={(v) => setChannel(v as "internal" | "instructor_visible")}>
          <TabsList className="grid grid-cols-2 w-full mb-2">
            <TabsTrigger value="internal" className="gap-1.5 text-xs">
              <Lock className="size-3" aria-hidden /> Internal
            </TabsTrigger>
            <TabsTrigger value="instructor_visible" className="gap-1.5 text-xs">
              <Globe className="size-3" aria-hidden /> Shared
              {sharedCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
                  {sharedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-[10px] text-muted-foreground pb-2">
          {isShared
            ? "Visible to instructor, TAs, and admin"
            : "Only visible to admin and TAs — instructor cannot see this"}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {visibleComments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="size-7 mb-2 opacity-20" />
              <p className="text-xs font-medium">No messages in this channel</p>
              {isShared && (
                <p className="text-[11px] mt-1 opacity-70">
                  Messages here are visible to the instructor
                </p>
              )}
            </div>
          )}
          {visibleComments.map((comment) => {
            const isMe = comment.author_id === currentUserId
            const titleLabel = comment.author_title
              ? (ROLE_TITLE_LABELS[comment.author_title] ?? null)
              : null
            const roleLabel = titleLabel ?? ROLE_LABELS[comment.author_role ?? ""] ?? "Team"
            const roleColor = titleLabel
              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
              : (ROLE_COLORS[comment.author_role ?? ""] ?? "bg-muted text-muted-foreground")
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

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder={
              isShared
                ? "Write a message visible to the instructor…"
                : "Internal note — admin and TAs only…"
            }
            className="min-h-[80px] resize-none text-sm"
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
        {isShared && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Globe className="size-3" aria-hidden />
            This message will be visible to the instructor
          </p>
        )}
      </div>
    </div>
  )
}
