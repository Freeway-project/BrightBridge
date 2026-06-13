"use client"

import { useState, useEffect, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
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
} from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import type { CourseComment } from "@/lib/services/comments"
import type { CourseIssue } from "@/lib/issues/types"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { instructorRaiseQuestionAction, instructorSignOffAction } from "../actions"

// --- Accordion section wrapper ---

interface AccSectionProps {
  id: string
  title: string
  icon: ReactNode
  badge?: ReactNode
  open: boolean
  onToggle: (id: string) => void
  colorBorder: string
  colorHeader: string
  colorTitle: string
  colorDivider: string
  children: ReactNode
}

function AccSection({
  id,
  title,
  icon,
  badge,
  open,
  onToggle,
  colorBorder,
  colorHeader,
  colorTitle,
  colorDivider,
  children,
}: AccSectionProps) {
  return (
    <div className={cn("rounded-xl border overflow-hidden", colorBorder)}>
      <button
        type="button"
        className={cn("w-full flex items-center justify-between px-4 py-3 text-left", colorHeader)}
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span className={cn("flex items-center gap-2 text-sm font-bold", colorTitle)}>
          {icon}
          {title}
          {badge}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className={cn("border-t p-4", colorDivider)}>
          {children}
        </div>
      )}
    </div>
  )
}

// --- Questions section internals ---

function QuestionItem({ issue }: { issue: CourseIssue }) {
  const hasReply = (issue.comment_count ?? 0) > 0
  const date = new Date(issue.created_at).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-1.5">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{issue.title}</p>
      <p className="text-xs text-amber-700 dark:text-amber-400">Asked · {date}</p>
      {issue.description?.trim() && (
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{issue.description}</p>
      )}
      <div className={cn("inline-flex items-center gap-1 text-xs font-medium", hasReply ? "text-emerald-600" : "text-amber-600 dark:text-amber-400")}>
        {hasReply ? <CircleCheck className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
        {hasReply ? `Replied (${issue.comment_count} message${issue.comment_count === 1 ? "" : "s"})` : "Waiting for reply…"}
      </div>
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

type SectionId = "summary" | "review" | "questions" | "messages" | "approve"

const STORAGE_KEY = (courseId: string) => `coursebridge:accordion:${courseId}`

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

  // --- Accordion open state ---
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set(["summary", "review"] as SectionId[])
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(courseId))
      if (saved) {
        setOpenSections(new Set(JSON.parse(saved) as SectionId[]))
      }
    } catch { /* ignore */ }
  }, [courseId])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id as SectionId)) {
        next.delete(id as SectionId)
      } else {
        next.add(id as SectionId)
      }
      try {
        localStorage.setItem(STORAGE_KEY(courseId), JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
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

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Acting-on-behalf banner */}
      {actingAsLeader && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-200">
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

      {/* Read-only banner */}
      {readOnly && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-6 py-2 text-sm text-muted-foreground">
          <Eye className="size-4 shrink-0" aria-hidden />
          Department view — you can read but not approve or ask questions.
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-3 p-6">

        {/* 1 — Course Summary */}
        <AccSection
          id="summary"
          title="Course Summary"
          icon={<ClipboardList className="size-4" aria-hidden />}
          open={openSections.has("summary")}
          onToggle={toggleSection}
          colorBorder="border-slate-200 dark:border-slate-700"
          colorHeader="bg-slate-50 dark:bg-slate-900"
          colorTitle="text-slate-800 dark:text-slate-200"
          colorDivider="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
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
          {finalSummary?.trim() && (
            <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Note from reviewer</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{finalSummary}</p>
            </div>
          )}
        </AccSection>

        {/* 2 — What We Checked */}
        <AccSection
          id="review"
          title="What We Checked"
          icon={<Search className="size-4" aria-hidden />}
          open={openSections.has("review")}
          onToggle={toggleSection}
          colorBorder="border-indigo-200 dark:border-indigo-800"
          colorHeader="bg-indigo-50 dark:bg-indigo-950"
          colorTitle="text-indigo-900 dark:text-indigo-200"
          colorDivider="border-indigo-200 dark:border-indigo-800 bg-white dark:bg-indigo-950/30"
        >
          {reviewNode}
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 p-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
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
        </AccSection>

        {/* 3 — My Questions */}
        <AccSection
          id="questions"
          title="My Questions"
          icon={<MessageCircleQuestion className="size-4" aria-hidden />}
          badge={
            openQuestions > 0 ? (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5">
                {openQuestions} open
              </span>
            ) : undefined
          }
          open={openSections.has("questions")}
          onToggle={toggleSection}
          colorBorder="border-amber-200 dark:border-amber-800"
          colorHeader="bg-amber-50 dark:bg-amber-950"
          colorTitle="text-amber-900 dark:text-amber-200"
          colorDivider="border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/20"
        >
          {questions === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading questions…
            </p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">No questions yet.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {questions.map((q) => <QuestionItem key={q.id} issue={q} />)}
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
        </AccSection>

        {/* 4 — Messages */}
        <AccSection
          id="messages"
          title="Messages"
          icon={<MessageSquare className="size-4" aria-hidden />}
          badge={
            sharedComments.length > 0 ? (
              <span className="rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5">
                {sharedComments.length}
              </span>
            ) : undefined
          }
          open={openSections.has("messages")}
          onToggle={toggleSection}
          colorBorder="border-sky-200 dark:border-sky-800"
          colorHeader="bg-sky-50 dark:bg-sky-950"
          colorTitle="text-sky-900 dark:text-sky-200"
          colorDivider="border-sky-200 dark:border-sky-800 bg-white dark:bg-sky-950/20"
        >
          <CourseDiscussion
            courseId={courseId}
            comments={sharedComments}
            currentUserId={currentUserId}
            canPost={!readOnly}
          />
        </AccSection>

        {/* 5 — Approve */}
        <AccSection
          id="approve"
          title="Approve This Course"
          icon={<CheckCircle2 className="size-4" aria-hidden />}
          open={openSections.has("approve")}
          onToggle={toggleSection}
          colorBorder="border-emerald-200 dark:border-emerald-800"
          colorHeader="bg-emerald-50 dark:bg-emerald-950"
          colorTitle="text-emerald-900 dark:text-emerald-200"
          colorDivider="border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/20"
        >
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
        </AccSection>

      </div>
    </div>
  )
}
