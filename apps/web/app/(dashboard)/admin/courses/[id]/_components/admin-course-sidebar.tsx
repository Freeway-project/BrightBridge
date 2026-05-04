"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import type { AdminCourseRow } from "@/lib/admin/queries"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import { approveReviewAction, requestFixesAction } from "../../../actions"
import { sendEscalationReplyAction, resolveEscalationAction } from "../actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, MessageSquare, AlertTriangle, Clock, User, Send } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  course: AdminCourseRow
  escalations: EscalationWithMessages[]
  currentUserId: string
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-400/30",
  major:    "bg-orange-500/15 text-orange-600 border-orange-400/30",
  minor:    "bg-yellow-500/15 text-yellow-700 border-yellow-400/30",
}

function getInitials(name?: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function AdminCourseSidebar({ course, escalations, currentUserId }: Props) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const openEscalations = escalations.filter((e) => e.status === "open")

  function handleApprove() {
    startTransition(async () => {
      await approveReviewAction(course.id)
      toast.success("Course approved")
      router.push("/admin")
    })
  }

  function handleSendFixes() {
    startTransition(async () => {
      await requestFixesAction(course.id, note)
      toast.info("Fixes requested from TA")
      router.push("/admin")
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-hidden">
      {/* Course Summary */}
      <section className="space-y-4 shrink-0">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
          <StatusBadge status={course.status} />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            <span className="font-medium">TA:</span>
            <span className="text-muted-foreground">
              {course.ta?.name ?? course.ta?.email ?? "Unassigned"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span className="font-medium">Last Updated:</span>
            <span className="text-muted-foreground">
              {new Date(course.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
            </span>
          </div>
          {course.department && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-muted-foreground" />
              <span className="font-medium">Dept:</span>
              <span className="text-muted-foreground">{course.department}</span>
            </div>
          )}
        </div>
      </section>

      <Separator className="shrink-0" />

      {/* Admin Actions */}
      <section className="space-y-4 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Actions</h3>

        {!fixesOpen ? (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full justify-start"
              disabled={isPending || course.status !== "submitted_to_admin"}
              onClick={handleApprove}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Approve Course
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              disabled={isPending || course.status !== "submitted_to_admin"}
              onClick={() => setFixesOpen(true)}
            >
              <MessageSquare className="mr-2 size-4" />
              Request Fixes
            </Button>
            {course.status !== "submitted_to_admin" && (
              <p className="text-[10px] text-muted-foreground italic">
                Actions available once TA submits review.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/10">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Note for TA</p>
            <Textarea
              autoFocus
              placeholder="What needs fixing?"
              className="bg-background min-h-[100px] text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="flex-1" disabled={isPending} onClick={handleSendFixes}>
                Send
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" disabled={isPending} onClick={() => { setFixesOpen(false); setNote("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {openEscalations.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <section className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="size-3.5 text-red-500" />
              Open Escalations
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-5 h-full flex flex-col">
                {openEscalations.map((e) => (
                  <AdminEscalationThread
                    key={e.id}
                    courseId={course.id}
                    currentUserId={currentUserId}
                    escalation={e}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function AdminEscalationThread({
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
      await sendEscalationReplyAction(courseId, escalation.id, body)
      toast.success("Reply sent")
      setBody("")
    })
  }

  function handleResolve() {
    startTransition(async () => {
      await resolveEscalationAction(escalation.id, courseId)
      toast.success("Escalation resolved")
    })
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-muted/5 flex-1 min-h-0">
      <div className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold shadow-sm shrink-0",
        SEVERITY_STYLES[escalation.severity]
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
              <div key={msg.id} className={cn("flex gap-2.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
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
                      : "bg-muted/50 text-foreground border border-border/50 rounded-tl-none"
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

      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-[12px] font-bold gap-2 border-green-500/30 text-green-700 hover:bg-green-500 hover:text-white dark:hover:bg-green-500/20 transition-all rounded-lg shrink-0"
        disabled={isPending}
        onClick={handleResolve}
      >
        <CheckCircle2 className="size-4" />
        Mark as Resolved
      </Button>
    </div>
  )
}
