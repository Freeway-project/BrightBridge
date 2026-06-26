"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import type { CourseComment } from "@/lib/services/comments"
import { postSharedCommentAction, markAnsweredAction } from "@/lib/actions/shared-comment-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare, HelpCircle, CheckCircle2 } from "lucide-react"
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
  canPost?: boolean
  canMarkAnswered?: boolean
}

function getInitials(name?: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function CourseChatPanel({
  courseId,
  comments,
  currentUserId,
  canPost = true,
  canMarkAnswered = false,
}: Props) {
  const [body, setBody] = useState("")
  const [isQuestion, setIsQuestion] = useState(false)
  const [sendPending, startSend] = useTransition()
  const [answerPending, startAnswer] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  function handleSend() {
    if (!body.trim() || sendPending) return
    const questionFlag = isQuestion
    startSend(async () => {
      await postSharedCommentAction(courseId, body.trim(), questionFlag)
      setBody("")
      setIsQuestion(false)
    })
  }

  function handleMarkAnswered(commentId: string) {
    startAnswer(async () => {
      try {
        await markAnsweredAction(courseId, commentId)
      } catch (err) {
        console.error("Failed to mark comment answered:", err)
      }
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="size-4" aria-hidden />
          Course Chat
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Visible to instructor, TA, and admin
        </p>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="mb-2 size-7 opacity-30" aria-hidden />
              <p className="text-xs font-medium">No messages yet</p>
              <p className="mt-0.5 text-[11px] opacity-60">
                Start the conversation — the reviewer team can see everything here
              </p>
            </div>
          )}

          {comments.map((comment) => {
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
                className={cn("flex max-w-[88%] gap-2.5", isMe ? "ml-auto flex-row-reverse" : "")}
              >
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-bold",
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {getInitials(comment.author_name)}
                  </AvatarFallback>
                </Avatar>

                <div className={cn("space-y-1", isMe ? "flex flex-col items-end" : "")}>
                  {/* Author line */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {comment.author_name ?? "Unknown"}
                    </span>
                    <span className={cn("rounded-full px-1.5 py-0 text-[10px] font-semibold", roleColor)}>
                      {roleLabel}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground"
                      title={new Date(comment.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    >
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {comment.on_behalf_of_name && (
                    <span className="text-[10px] italic text-muted-foreground">
                      on behalf of {comment.on_behalf_of_name}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      isMe
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none border border-border bg-muted/60 text-foreground",
                      comment.is_question && !comment.is_answered &&
                        "border-l-2 border-l-amber-400 dark:border-l-amber-500",
                      comment.is_question && comment.is_answered &&
                        "border-l-2 border-l-emerald-500 dark:border-l-emerald-400",
                    )}
                  >
                    {/* Question / Answered badge */}
                    {comment.is_question && (
                      <div className="mb-1.5 flex items-center gap-1">
                        {comment.is_answered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" aria-hidden /> Answered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            <HelpCircle className="size-3" aria-hidden /> Question
                          </span>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </div>

                  {/* Mark answered button — admin/TA only, open questions only */}
                  {comment.is_question && !comment.is_answered && canMarkAnswered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-emerald-700"
                      disabled={answerPending}
                      onClick={() => handleMarkAnswered(comment.id)}
                    >
                      <CheckCircle2 className="size-3" aria-hidden />
                      Mark answered
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Sentinel for auto-scroll to bottom */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      {canPost && (
        <div className="shrink-0 border-t border-border bg-muted/10 p-3">
          <div className="flex gap-2">
            <Textarea
              placeholder={
                isQuestion
                  ? "Type your question — the reviewer team will reply here…"
                  : "Write a message visible to all parties…"
              }
              className="min-h-[70px] resize-none text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <div className="flex shrink-0 flex-col gap-1.5 self-end">
              {/* Question toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8",
                  isQuestion
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={isQuestion ? "Remove question flag" : "Flag as question"}
                onClick={() => setIsQuestion((v) => !v)}
              >
                <HelpCircle className="size-4" aria-hidden />
              </Button>
              {/* Send */}
              <Button
                size="icon"
                className="size-8"
                disabled={!body.trim() || sendPending}
                onClick={handleSend}
              >
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          {isQuestion && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <HelpCircle className="size-3" aria-hidden />
              This message will be flagged as a question for the team to answer
            </p>
          )}
        </div>
      )}
    </div>
  )
}
