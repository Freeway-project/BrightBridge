"use client"

import { useEffect, useState, type ReactNode } from "react"
import { HelpCircle, PanelsTopLeft, Sparkles } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
        </div>
      ) : (
        full
      )}
    </div>
  )
}
