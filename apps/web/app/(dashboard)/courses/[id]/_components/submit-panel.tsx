"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Circle, Send } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { submitReview } from "@/lib/workspace/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReviewSummary } from "./review-summary"
import { MovingBorderContainer } from "@/components/ui/moving-border"
import { toast } from "sonner"

type SubmitPanelProps = {
  courseId: string
  courseStatus: CourseStatus
  sections: { key: string; label: string; complete: boolean; required: boolean }[]
  reviewData?: {
    course: { id: string; code: string; title: string; term?: string }
    metadata?: Record<string, unknown>
    reviewMatrix?: { pass: number; fixNeeded: number; missing: number; notApplicable: number }
    syllabusgradebook?: Record<string, unknown>
    issues?: Array<{ id: string; type: string; severity: "minor" | "major" | "critical"; status: "open" | "fixed" | "escalated" | "resolved" }>
    notes?: string
  }
}

export function SubmitPanel({ courseId, courseStatus, sections, reviewData }: SubmitPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const submitAllowedStatuses: CourseStatus[] = ["assigned_to_ta", "ta_review_in_progress", "admin_changes_requested"]
  const isStatusSubmittable = submitAllowedStatuses.includes(courseStatus)
  const blockers = sections.filter((section) => section.required && !section.complete)
  const disabled = blockers.length > 0 || isPending || !isStatusSubmittable

  const handleSubmit = () => {
    if (!isStatusSubmittable) {
      const message = `Cannot submit from current status: ${courseStatus.replaceAll("_", " ")}.`
      setErrorMsg(message)
      toast.error(message)
      return
    }

    startTransition(async () => {
      setErrorMsg(null)
      const res = await submitReview(courseId)
      if (!res?.ok) {
        const message = res?.error || "Failed to submit."
        setErrorMsg(message)
        toast.error(message)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        return
      }

      toast.success("Review submitted to admin.")
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    })
  }

  return (
    <div className="space-y-6">
      {/* Review Summary - Always shown first */}
      {reviewData && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Review Summary</h2>
          <ReviewSummary {...reviewData} />
        </div>
      )}

      {/* Submit Card - After review */}
      <MovingBorderContainer containerClassName="max-w-2xl" className="shadow-xl shadow-primary/5">
        <Card className="border-0 bg-transparent shadow-none ring-0">
          <CardHeader>
            <CardTitle className="text-base">Ready to Submit?</CardTitle>
          </CardHeader>
        <CardContent className="space-y-5">
        <div className="space-y-3">
          {sections.map((section) => (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2" key={section.key}>
              <div className="flex items-center gap-2">
                {section.complete ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{section.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {section.complete ? "Complete" : section.required ? "Required" : "Optional"}
              </span>
            </div>
          ))}
        </div>

        {blockers.length > 0 ? (
          <p className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-700">
            Complete Metadata and Review Matrix before submitting.
          </p>
        ) : null}

        {!isStatusSubmittable ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            This course is not in a TA-submittable stage. Current status: {courseStatus.replaceAll("_", " ")}.
          </p>
        ) : null}

        {errorMsg ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            disabled={disabled}
            onClick={handleSubmit}
            type="button"
            size="lg"
          >
            <Send className="size-4" />
            {isPending ? "Submitting..." : "Submit to Admin"}
          </Button>
        </div>
          </CardContent>
        </Card>
      </MovingBorderContainer>
    </div>
  )
}
