"use client"

import { useTransition } from "react"
import { CheckCircle2, Circle, Send } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { submitReview } from "@/lib/workspace/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SubmitPanelProps = {
  courseId: string
  courseStatus: CourseStatus
  sections: { key: string; label: string; complete: boolean; required: boolean }[]
}

export function SubmitPanel({ courseId, courseStatus, sections }: SubmitPanelProps) {
  const [isPending, startTransition] = useTransition()
  const blockers = sections.filter((section) => section.required && !section.complete)
  const disabled = blockers.length > 0 || isPending || courseStatus === "submitted_to_admin"

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Submit to Admin</CardTitle>
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

        <div className="flex justify-end">
          <Button
            disabled={disabled}
            onClick={() => startTransition(() => void submitReview(courseId))}
            type="button"
          >
            <Send className="size-4" />
            {isPending ? "Submitting..." : "Submit to Admin"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
