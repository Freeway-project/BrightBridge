"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { HelpCircle, PanelsTopLeft, ShieldCheck, Sparkles } from "lucide-react"
import { ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import type { CourseStatus } from "@coursebridge/workflow"
import type { TabId } from "./instructor-accordion-view"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { InstructorSimpleWizard } from "./instructor-simple-wizard"
import { useInstructorTour } from "./instructor-guided-tour"

export const CourseTabContext = createContext<{
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
} | null>(null)

export function useCourseTab() {
  return useContext(CourseTabContext)
}

const SEEN_KEY = "coursebridge:instructor-tour-seen"

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  reviewNode: ReactNode
  full: ReactNode
  actingOnBehalfOfName?: string | null
  actingAsTitle?: string | null
}

export function InstructorCourseShell({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  full,
  actingOnBehalfOfName,
  actingAsTitle,
}: Props) {
  const [mode, setMode] = useStickyTabState("instructor-view-mode", "simple")
  const [step, setStep] = useState(0)
  // Persisted per-course so refreshing the page restores the last open tab.
  // Key matches the accordion's own key: coursebridge:tab:${courseId}
  const [activeFullTab, setActiveFullTab] = useStickyTabState(courseId, "review") as [TabId, (t: TabId) => void]
  const { startTour } = useInstructorTour(setStep)

  const { canApprove } = getInstructorSimpleState(status, readOnly)
  const tourAvailable = canApprove
  const isSimple = mode === "simple"

  useEffect(() => {
    if (!tourAvailable || !isSimple) return
    let seen = false
    try { seen = !!localStorage.getItem(SEEN_KEY) } catch { seen = true }
    if (seen) return
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      try { localStorage.setItem(SEEN_KEY, "1") } catch { /* ignore */ }
      startTour()
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [tourAvailable, isSimple, startTour])

  const actingAsLeader = !!actingAsTitle
  const leaderLabel = actingAsTitle ? (ROLE_TITLE_LABELS[actingAsTitle] ?? "Leader") : null

  // Called from the simple wizard when instructor wants to open chat
  function handleRequestChat() {
    setActiveFullTab("chat")
    setMode("full")
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
            onRequestChat={handleRequestChat}
          />
        </div>
      ) : (
        <CourseTabContext.Provider value={{ activeTab: activeFullTab, setActiveTab: setActiveFullTab }}>
          {full}
        </CourseTabContext.Provider>
      )}
    </div>
  )
}
