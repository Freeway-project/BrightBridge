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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { CourseStatus } from "@coursebridge/workflow"

interface Props {
  course: AdminCourseRow
  escalations: EscalationWithMessages[]
  currentUserId: string
}

type PipelineStage = "unassigned" | "ta-review" | "admin-review" | "comms" | "instructor" | "approved"

function getPipelineStage(status: CourseStatus): PipelineStage {
  if (status === "course_created") return "unassigned"
  if (status === "assigned_to_ta" || status === "ta_review_in_progress") return "ta-review"
  if (status === "submitted_to_admin" || status === "admin_changes_requested") return "admin-review"
  if (status === "ready_for_instructor") return "comms"
  if (status === "sent_to_instructor" || status === "instructor_questions" || status === "instructor_approved") return "instructor"
  if (status === "final_approved") return "approved"
  return "ta-review"
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

function getStatusLabel(status: CourseStatus): string {
  const labels: Record<string, string> = {
    course_created: "Unassigned",
    assigned_to_ta: "Assigned",
    ta_review_in_progress: "Reviewing",
    submitted_to_admin: "Pending Admin",
    admin_changes_requested: "Fixes Needed",
    ready_for_instructor: "Ready for Instructor",
    sent_to_instructor: "Instructor Review",
    instructor_questions: "Questions",
    instructor_approved: "Awaiting Sign-off",
    final_approved: "Approved",
  }
  return labels[status] || status
}

export function AdminCourseSidebar({ course, escalations, currentUserId }: Props) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const openEscalations = escalations.filter((e) => e.status === "open")
  const stage = getPipelineStage(course.status as CourseStatus)

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
    <div className="flex flex-col h-full overflow-hidden bg-[--surface-2]">
      {/* Sidebar Header */}
      <div className="bg-[--surface-0] border-b border-[--border-default] px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Course Details</h3>
      </div>

      {/* Pipeline Banner */}
      <div className="px-4 py-3 shrink-0">
        <div className={cn(
          "bg-[--stage-" + stage + "]/10 border border-[--stage-" + stage + "]/20 text-[--stage-" + stage + "] text-sm text-center py-2 rounded-md font-medium"
        )}>
          {getStatusLabel(course.status as CourseStatus)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Course Summary */}
        <section className="space-y-4">
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

        <Separator className="bg-[--border-subtle]" />

        {/* Admin Actions */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Actions</h3>

          {!fixesOpen ? (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-start bg-primary text-primary-foreground hover:brightness-110"
                disabled={isPending || course.status !== "submitted_to_admin"}
                onClick={handleApprove}
              >
                <CheckCircle2 className="mr-2 size-4" />
                Approve Course
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-orange-400 border-orange-400/20 hover:bg-orange-400/10"
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
            <div className="space-y-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <p className="text-xs font-medium text-orange-400">Note for TA</p>
              <Textarea
                autoFocus
                placeholder="What needs fixing?"
                className="bg-[--surface-4] border-[--border-default] min-h-[100px] text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="flex-1" disabled={isPending} onClick={handleSendFixes}>
                  Send
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 hover:bg-[--surface-4]" disabled={isPending} onClick={() => { setFixesOpen(false); setNote("") }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        {openEscalations.length > 0 && (
          <>
            <Separator className="bg-[--border-subtle]" />
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-red-500" />
                Open Escalations
              </h3>
              <div className="space-y-5">
                {openEscalations.map((e) => (
                  <AdminEscalationThread
                    key={e.id}
                    courseId={course.id}
                    currentUserId={currentUserId}
                    escalation={e}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
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
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-[--border-default] bg-[--surface-3]/50 flex-1 min-h-0">
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

      <ScrollArea className="flex-1 min-h-[150px] rounded-lg border border-[--border-default] bg-[--surface-4] p-3 shadow-inner" ref={scrollRef}>
        <div className="space-y-4">
          {escalation.messages.map((msg) => {
            const isMe = msg.author_id === currentUserId
            return (
              <div key={msg.id} className={cn("flex gap-2.5 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <Avatar className="size-7 shrink-0 border border-[--border-subtle] shadow-sm">
                  <AvatarFallback className="text-[10px] font-bold bg-[--surface-3] text-muted-foreground">{getInitials(msg.author_name)}</AvatarFallback>
                </Avatar>
                <div className={cn("space-y-1", isMe ? "items-end text-right" : "items-start text-left")}>
                  <p className="text-[10px] font-medium text-muted-foreground/80 px-1">
                    {msg.author_name ?? "Unknown"} • {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                  <div className={cn(
                    "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-[--surface-3] text-foreground border border-[--border-subtle] rounded-tl-none"
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
          className="min-h-[56px] resize-none text-[13px] flex-1 bg-[--surface-4] border-[--border-default] focus:border-primary/40 transition-colors"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <Button
          size="icon"
          className="size-10 shrink-0 self-end rounded-full shadow-sm bg-primary text-primary-foreground hover:brightness-110"
          disabled={!body.trim() || isPending}
          onClick={handleSend}
        >
          <Send className="size-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-[12px] font-bold gap-2 border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white dark:hover:bg-green-500/20 transition-all rounded-lg shrink-0"
        disabled={isPending}
        onClick={handleResolve}
      >
        <CheckCircle2 className="size-4" />
        Mark as Resolved
      </Button>
    </div>
  )
}
