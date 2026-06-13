"use client"

import { useEffect, useState, type ReactNode } from "react"
import { HelpCircle, MessageSquare, PanelsTopLeft, ShieldCheck, Sparkles } from "lucide-react"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import type { CourseStatus } from "@coursebridge/workflow"
import type { CourseComment } from "@/lib/services/comments"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CourseDiscussion } from "@/components/shared/course-discussion"
import { InstructorSimpleWizard } from "./instructor-simple-wizard"
import { useInstructorTour } from "./instructor-guided-tour"

const SEEN_KEY = "coursebridge:instructor-tour-seen"

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  /** Server-rendered review summary for the Simple view. */
  reviewNode: ReactNode
  /** The existing 5-tab workspace, rendered when "Full details" is chosen. */
  full: ReactNode
  /** Shared comments (instructor_visible) for the Simple view discussion panel. */
  sharedComments: CourseComment[]
  /** The current user's ID for the discussion panel. */
  currentUserId: string
  /** Assigned instructor's name when a hierarchy leader is acting on their behalf. */
  actingOnBehalfOfName?: string | null
  /** The acting leader's org title (e.g. "dean") when delegating. */
  actingAsTitle?: string | null
}

/**
 * Wraps the instructor course view with a Simple / Full toggle. Simple is a
 * guided wizard tuned for non-technical instructors (with a "show me around"
 * walkthrough); Full is the unchanged 5-tab workspace. The choice is remembered
 * across courses. This component is presentation-only — both views call the
 * same existing server actions.
 */
export function InstructorCourseShell({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  full,
  sharedComments,
  currentUserId,
  actingOnBehalfOfName,
  actingAsTitle,
}: Props) {
  const [mode, setMode] = useStickyTabState("instructor-view-mode", "simple")
  const [step, setStep] = useState(0)
  const { startTour } = useInstructorTour(setStep)

  // The walkthrough only makes sense when the full wizard (ask / approve) is
  // available — i.e. an assigned instructor on an actionable course.
  const { canApprove } = getInstructorSimpleState(status, readOnly)
  const tourAvailable = canApprove
  const isSimple = mode === "simple"

  // Auto-run the tour once, ever, on the first actionable course opened.
  useEffect(() => {
    if (!tourAvailable || !isSimple) return
    let seen = false
    try {
      seen = !!localStorage.getItem(SEEN_KEY)
    } catch {
      // localStorage unavailable — skip auto-run rather than risk looping.
      seen = true
    }
    if (seen) return
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      try {
        localStorage.setItem(SEEN_KEY, "1")
      } catch {
        // ignore
      }
      startTour()
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [tourAvailable, isSimple, startTour])

  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Acting-on-behalf banner — a hierarchy leader is standing in for the
          assigned instructor. Actions are recorded under their own name on the
          instructor's behalf. */}
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

      {/* Toggle + help bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-6 py-2">
        <div
          data-tour="view-toggle"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Choose how to view this course"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isSimple}
            onClick={() => setMode("simple")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isSimple ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-4" aria-hidden /> Simple
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSimple}
            onClick={() => setMode("full")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !isSimple ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PanelsTopLeft className="size-4" aria-hidden /> Full details
          </button>
        </div>

        {isSimple && tourAvailable ? (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={startTour}>
            <HelpCircle className="size-4" aria-hidden />
            Help — show me around
          </Button>
        ) : null}
      </div>

      {/* Content */}
      {isSimple ? (
        <div className="flex-1 overflow-y-auto p-6">
          <InstructorSimpleWizard
            courseId={courseId}
            status={status}
            finalSummary={finalSummary}
            readOnly={readOnly}
            reviewNode={reviewNode}
            step={step}
            onStepChange={setStep}
          />

          {/* Shared discussion — always visible below the wizard steps */}
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Messages
              </h2>
              {sharedComments.length > 0 && (
                <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
                  {sharedComments.length}
                </span>
              )}
            </div>
            <CourseDiscussion
              courseId={courseId}
              comments={sharedComments}
              currentUserId={currentUserId}
              canPost={!readOnly}
            />
          </div>
        </div>
      ) : (
        full
      )}
    </div>
  )
}
