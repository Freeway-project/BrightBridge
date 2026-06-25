"use client"

import { useState, useEffect, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  CheckCircle2,
  MessageCircleQuestion,
  ClipboardList,
  MessageSquare,
  Search,
  ShieldCheck,
  Eye,
  Loader2,
  CircleCheck,
  Clock,
  Send,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { CourseStatus } from "@coursebridge/workflow"
import type { CourseComment } from "@/lib/services/comments"
import type { CourseIssue, IssueComment } from "@/lib/issues/types"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CopyButton } from "@/components/ui/copy-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { instructorRaiseQuestionAction, instructorSignOffAction, getIssueCommentsAction, postIssueCommentAction } from "../actions"


// --- Questions section internals ---

const REPLY_ROLE_LABELS: Record<string, string> = {
  admin_full: "Admin",
  admin_viewer: "Comms",
  super_admin: "Admin",
  standard_user: "TA",
  instructor: "Instructor",
}

function getInitials(name?: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function QuestionItem({ issue, courseId }: { issue: CourseIssue; courseId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<IssueComment[] | null>(null)
  const [replyBody, setReplyBody] = useState("")
  const [loadPending, startLoad] = useTransition()
  const [replyPending, startReply] = useTransition()

  const replyCount = comments !== null ? comments.filter((c) => !c.is_system_message).length : (issue.comment_count ?? 0)
  const hasReply = replyCount > 0
  const date = new Date(issue.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })

  function handleToggle() {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening && comments === null) {
      startLoad(async () => {
        const rows = await getIssueCommentsAction(courseId, issue.id)
        setComments(rows)
      })
    }
  }

  function handleReply() {
    if (!replyBody.trim() || replyPending) return
    startReply(async () => {
      await postIssueCommentAction(courseId, issue.id, replyBody.trim())
      setReplyBody("")
      const rows = await getIssueCommentsAction(courseId, issue.id)
      setComments(rows)
    })
  }

  const visibleComments = (comments ?? []).filter((c) => !c.is_system_message)

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
        onClick={handleToggle}
      >
        <ChevronRight className={cn("size-3.5 mt-0.5 shrink-0 text-amber-600 transition-transform duration-200", isOpen && "rotate-90")} aria-hidden />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{issue.title}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Asked · {date}</p>
          {issue.description?.trim() && !isOpen && (
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed line-clamp-2">{issue.description}</p>
          )}
          <div className={cn("inline-flex items-center gap-1 text-xs font-medium", hasReply ? "text-emerald-600" : "text-amber-600 dark:text-amber-400")}>
            {hasReply ? <CircleCheck className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
            {hasReply ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Waiting for reply…"}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/10 p-3 space-y-3">
          {issue.description?.trim() && (
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{issue.description}</p>
          )}

          {loadPending ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading replies…
            </p>
          ) : visibleComments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">No replies yet — your question is with the reviewer.</p>
          ) : (
            <div className="space-y-2">
              {visibleComments.map((c) => {
                const name = c.author?.full_name ?? "Unknown"
                const roleLabel = REPLY_ROLE_LABELS[c.author?.role ?? ""] ?? "Team"
                return (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="size-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[9px] font-bold bg-muted">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{name}</span>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 text-[10px] font-semibold">{roleLabel}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="rounded-lg bg-muted/60 border border-border px-2.5 py-1.5 text-sm">{c.body}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Textarea
              placeholder="Reply to the reviewer…"
              className="min-h-[60px] resize-none text-xs"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply() } }}
            />
            <Button size="icon" className="self-end shrink-0 size-8" disabled={!replyBody.trim() || replyPending} onClick={handleReply}>
              {replyPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main component ---

export interface InstructorAccordionCourseMeta {
  term?: string | null
  department?: string | null
  sourceCourseId?: string | null
  targetCourseId?: string | null
}

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  reviewNode: ReactNode
  sharedComments: CourseComment[]
  currentUserId: string
  actingOnBehalfOfName?: string | null
  actingAsTitle?: string | null
  meta: InstructorAccordionCourseMeta
}

type TabId = "summary" | "review" | "questions" | "discussion" | "approve"

const STORAGE_KEY = (courseId: string) => `coursebridge:tab:${courseId}`

export function InstructorAccordionView({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  sharedComments,
  currentUserId,
  actingOnBehalfOfName,
  actingAsTitle,
  meta,
}: Props) {
  const router = useRouter()
  const { canAsk, canApprove, statusMessage } = getInstructorSimpleState(status, readOnly)

  // --- Active tab ---
  const [activeTab, setActiveTab] = useState<TabId>("review")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(courseId))
      if (saved && ["summary", "review", "questions", "discussion", "approve"].includes(saved)) {
        setActiveTab(saved as TabId)
      }
    } catch { /* ignore */ }
  }, [courseId])

  const gotoTab = (id: TabId) => {
    setActiveTab(id)
    try { localStorage.setItem(STORAGE_KEY(courseId), id) } catch { /* ignore */ }
  }

  // --- Review acknowledgment ---
  const [reviewAcked, setReviewAcked] = useState(false)

  // --- Questions ---
  const [questions, setQuestions] = useState<CourseIssue[] | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [qTitle, setQTitle] = useState("")
  const [qDescription, setQDescription] = useState("")
  const [askPending, startAsk] = useTransition()

  useEffect(() => {
    let active = true
    getIssuesForCourseAction(courseId, { phase: "provision", type: "question" })
      .then((rows) => active && setQuestions(rows))
      .catch(() => active && setQuestions([]))
    return () => { active = false }
  }, [courseId])

  const submitQuestion = () => {
    if (!qTitle.trim()) return
    startAsk(async () => {
      await instructorRaiseQuestionAction(courseId, qTitle, qDescription)
      setAskOpen(false)
      setQTitle("")
      setQDescription("")
      router.refresh()
      // Re-fetch questions after posting
      const rows = await getIssuesForCourseAction(courseId, { phase: "provision", type: "question" })
      setQuestions(rows)
    })
  }

  // --- Approve ---
  const [openIssues, setOpenIssues] = useState<CourseIssue[] | null>(null)
  const [approveAcked, setApproveAcked] = useState(false)
  const [signPending, startSign] = useTransition()

  useEffect(() => {
    if (!canApprove) return
    let active = true
    getIssuesForCourseAction(courseId, { status: "open" })
      .then((rows) => active && setOpenIssues(rows))
      .catch(() => active && setOpenIssues([]))
    return () => { active = false }
  }, [courseId, canApprove])

  const confirmApprove = () => {
    if (!approveAcked) return
    startSign(async () => {
      await instructorSignOffAction(courseId, (openIssues ?? []).map((i) => i.id))
      router.refresh()
    })
  }

  // --- Derived ---
  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null
  const openQuestions = questions?.filter((q) => q.status === "open").length ?? 0

  // --- Tab definitions ---
  const tabs: { id: TabId; label: string; icon: ReactNode; badge?: ReactNode }[] = [
    {
      id: "summary",
      label: "Summary",
      icon: <ClipboardList className="size-3.5" aria-hidden />,
    },
    {
      id: "review",
      label: "Review",
      icon: <Search className="size-3.5" aria-hidden />,
    },
    {
      id: "questions",
      label: "Questions",
      icon: <MessageCircleQuestion className="size-3.5" aria-hidden />,
      badge: openQuestions > 0 ? (
        <span className="ml-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.5 leading-none">
          {openQuestions}
        </span>
      ) : undefined,
    },
    {
      id: "discussion",
      label: "Discussion",
      icon: <MessageSquare className="size-3.5" aria-hidden />,
      badge: sharedComments.length > 0 ? (
        <span className="ml-1 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[9px] font-bold px-1.5 py-0.5 leading-none">
          {sharedComments.length}
        </span>
      ) : undefined,
    },
    {
      id: "approve",
      label: "Approve",
      icon: <CheckCircle2 className="size-3.5" aria-hidden />,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Banners */}
      {actingAsLeader && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-200 shrink-0">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span>
            Acting as <span className="font-semibold">{leaderLabel}</span>
            {actingOnBehalfOfName ? (
              <> on behalf of <span className="font-semibold">{actingOnBehalfOfName}</span></>
            ) : (
              <> for this course</>
            )}
            . Your actions are recorded under your name.
          </span>
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-6 py-2 text-sm text-muted-foreground shrink-0">
          <Eye className="size-4 shrink-0" aria-hidden />
          Department view — you can read but not approve or ask questions.
        </div>
      )}

      {/* Tab strip */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-4 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => gotoTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "discussion" ? (
        // Discussion fills all remaining height (CourseDiscussion has its own scroll)
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <CourseDiscussion
            courseId={courseId}
            comments={sharedComments}
            currentUserId={currentUserId}
            canPost={!readOnly}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 p-6">

            {/* Summary tab */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Course Summary</h2>
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                  {meta.term && (
                    <>
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-medium">{meta.term}</span>
                    </>
                  )}
                  {meta.department && (
                    <>
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{meta.department}</span>
                    </>
                  )}
                  {meta.sourceCourseId && (
                    <>
                      <span className="text-muted-foreground">Moodle ID</span>
                      <span className="font-mono text-xs">{meta.sourceCourseId}</span>
                    </>
                  )}
                  {meta.targetCourseId && (
                    <>
                      <span className="text-muted-foreground">Brightspace ID</span>
                      <span className="font-mono text-xs">{meta.targetCourseId}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Review tab */}
            {activeTab === "review" && (
              <div className="space-y-4">
                {finalSummary?.trim() && (
                  <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-blue-600 dark:text-blue-400" aria-hidden />
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Note from your reviewer</p>
                      </div>
                      <CopyButton value={finalSummary} label="reviewer note" />
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-blue-900 dark:text-blue-100">{finalSummary}</p>
                  </div>
                )}
                {reviewNode}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 p-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
                  <Checkbox
                    checked={reviewAcked}
                    onCheckedChange={(v) => setReviewAcked(v === true)}
                    className="mt-0.5"
                    aria-label="Acknowledge you've read the reviewer's notes"
                  />
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                    I've read the reviewer's notes and I understand what changed.
                  </span>
                </label>
              </div>
            )}

            {/* Questions tab */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Questions &amp; Issues</h2>

                {questions === null ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Loading questions…
                  </p>
                ) : questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">No questions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {questions.map((q) => <QuestionItem key={q.id} issue={q} courseId={courseId} />)}
                  </div>
                )}

                {canAsk && !askOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                    onClick={() => setAskOpen(true)}
                  >
                    <MessageCircleQuestion className="size-4" aria-hidden />
                    {questions?.length ? "Ask another question" : "Ask a question"}
                  </Button>
                )}

                {canAsk && askOpen && (
                  <div className="space-y-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-card p-4">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Your question <span className="text-destructive">*</span></p>
                      <Input
                        placeholder="What would you like to ask?"
                        value={qTitle}
                        onChange={(e) => setQTitle(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground">
                        Any details <span className="text-xs">(optional)</span>
                      </p>
                      <Textarea
                        placeholder="Add anything that helps explain it…"
                        value={qDescription}
                        onChange={(e) => setQDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAskOpen(false)} disabled={askPending}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={submitQuestion} disabled={askPending || !qTitle.trim()}>
                        {askPending ? <><Loader2 className="size-4 animate-spin mr-1" />Sending…</> : "Send to reviewer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Approve tab */}
            {activeTab === "approve" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Approve This Course</h2>
                {!canApprove ? (
                  <p className="text-sm text-muted-foreground py-1">
                    {statusMessage ?? "This course is not ready for your approval yet."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Once you have reviewed this information, please approve below so we know you are ready to prepare for your upcoming course offering.
                      (Live shells are created later through Banner when the academic calendar is finalized).
                    </p>

                    {openIssues === null ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking for open items…
                      </p>
                    ) : openIssues.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">The reviewer noted:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                          {openIssues.map((i) => (
                            <li key={i.id}>
                              <span className="font-medium text-foreground">{i.title}</span>
                              {i.description ? <span> — {i.description}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" aria-hidden /> No open items on this course.
                      </p>
                    )}

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                      <Checkbox
                        checked={approveAcked}
                        onCheckedChange={(v) => setApproveAcked(v === true)}
                        className="mt-0.5"
                        aria-label="Confirm approval"
                      />
                      <span className="text-base font-medium text-emerald-900 dark:text-emerald-200">
                        I've reviewed everything and I'm happy for this course to go live.
                      </span>
                    </label>

                    <Button
                      size="lg"
                      className="w-full h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
                      disabled={!approveAcked || signPending || openIssues === null}
                      onClick={confirmApprove}
                    >
                      {signPending ? (
                        <><Loader2 className="size-5 animate-spin" aria-hidden /> Approving…</>
                      ) : (
                        <><CheckCircle2 className="size-5" aria-hidden /> Approve my course</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
