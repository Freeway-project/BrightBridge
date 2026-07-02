"use client"

import { useState, useEffect, useTransition, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Eye,
  Loader2,
} from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import type { CourseComment } from "@/lib/services/comments"
import type { CourseIssue } from "@/lib/issues/types"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"
import { instructorSignOffAction } from "../actions"
import { CourseChatPanel } from "./course-chat-panel"
import { CourseTabContext } from "./instructor-course-shell"

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
  canMarkAnswered: boolean
  actingOnBehalfOfName?: string | null
  actingAsTitle?: string | null
  meta: InstructorAccordionCourseMeta
}

export type TabId = "summary" | "review" | "chat" | "approve"

const STORAGE_KEY = (courseId: string) => `coursebridge:tab:${courseId}`

export function InstructorAccordionView({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  sharedComments,
  currentUserId,
  canMarkAnswered,
  actingOnBehalfOfName,
  actingAsTitle,
  meta,
}: Props) {
  const shellTab = useContext(CourseTabContext)
  const router = useRouter()
  const { canApprove, statusMessage } = getInstructorSimpleState(status, readOnly)

  const [internalTab, setInternalTab] = useState<TabId>("review")
  // If rendered inside InstructorCourseShell, use context-controlled tab; otherwise self-manage
  const activeTab = shellTab?.activeTab ?? internalTab

  useEffect(() => {
    if (shellTab) return // context-controlled — shell handles persistence
    try {
      const saved = localStorage.getItem(STORAGE_KEY(courseId))
      if (saved && ["summary", "review", "chat", "approve"].includes(saved)) {
        setInternalTab(saved as TabId)
      }
    } catch { /* ignore */ }
  }, [courseId, shellTab])

  const gotoTab = (id: TabId) => {
    if (shellTab) {
      shellTab.setActiveTab(id)
    } else {
      setInternalTab(id)
      try { localStorage.setItem(STORAGE_KEY(courseId), id) } catch { /* ignore */ }
    }
  }

  // --- Review acknowledgment ---
  const [reviewAcked, setReviewAcked] = useState(false)

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

  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null

  const unansweredQuestions = sharedComments.filter((c) => c.is_question && !c.is_answered).length

  const tabs: { id: TabId; label: string; icon: ReactNode; badge?: ReactNode }[] = [
    {
      id: "summary",
      label: "Summary",
      icon: <ClipboardList className="size-4" aria-hidden />,
    },
    {
      id: "review",
      label: "Review",
      icon: <MessageSquare className="size-4" aria-hidden />,
    },
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="size-4" aria-hidden />,
      badge: unansweredQuestions > 0 ? (
        <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm">
          {unansweredQuestions}
        </span>
      ) : undefined,
    },
    {
      id: "approve",
      label: "Approve",
      icon: <CheckCircle2 className="size-4" aria-hidden />,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Banners */}
      {actingAsLeader && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-200">
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
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-6 py-2 text-sm text-muted-foreground">
          <Eye className="size-4 shrink-0" aria-hidden />
          Department view — you can read but not approve or post messages.
        </div>
      )}

      {/* Tab strip */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => gotoTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </div>

      {/* Chat tab fills height with its own scroll */}
      {activeTab === "chat" ? (
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <CourseChatPanel
            courseId={courseId}
            comments={sharedComments}
            currentUserId={currentUserId}
            canPost={!readOnly}
            canMarkAnswered={canMarkAnswered}
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
                  <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/50">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-blue-600 dark:text-blue-400" aria-hidden />
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Note from your reviewer</p>
                      </div>
                      <CopyButton value={finalSummary} label="reviewer note" />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900 dark:text-blue-100">{finalSummary}</p>
                  </div>
                )}
                {reviewNode}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30">
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

            {/* Approve tab */}
            {activeTab === "approve" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Approve This Course</h2>
                {!canApprove ? (
                  <p className="py-1 text-sm text-muted-foreground">
                    {statusMessage ?? "This course is not ready for your approval yet."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
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
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/30">
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
                      className="h-12 w-full gap-2 bg-emerald-600 text-base text-white hover:bg-emerald-700"
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
