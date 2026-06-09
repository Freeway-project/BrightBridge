"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useEffect, useState, useTransition } from "react"
import { CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import { instructorSignOffAction } from "../actions"
import type { CourseIssue } from "@/lib/issues/types"

interface Props {
  courseId: string
  finalSummary: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Final Summary & Sign-off. The instructor reads the TA's final summary and must
 * acknowledge (tick) every open issue before "Confirm sign-off" unlocks.
 */
export function InstructorSignOffDialog({ courseId, finalSummary, open, onOpenChange }: Props) {
  const [issues, setIssues] = useState<CourseIssue[] | null>(null)
  const [acked, setAcked] = useState<Record<string, boolean>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    let active = true
    setIssues(null)
    setAcked({})
    setLoadError(null)
    getIssuesForCourseAction(courseId, { status: "open" })
      .then((rows) => {
        if (active) setIssues(rows)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : "Could not load issues.")
      })
    return () => {
      active = false
    }
  }, [open, courseId])

  const allAcked = !!issues && issues.every((i) => acked[i.id])
  const canConfirm = !!issues && !isPending && allAcked

  function confirm() {
    if (!issues) return
    startTransition(async () => {
      await instructorSignOffAction(courseId, issues.map((i) => i.id))
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Final summary &amp; sign-off
          </DialogTitle>
          <DialogDescription>
            Please review the summary and confirm you&apos;ve seen each open item before signing off.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Final summary from the TA */}
          <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-semibold">Final Summary for Instructor</h3>
            </div>
            {finalSummary?.trim() ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{finalSummary}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No final summary was provided.</p>
            )}
          </section>

          {/* Open issues to acknowledge */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Open items {issues ? `(${issues.length})` : ""}
            </h3>

            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : !issues ? (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <LottieLoader className="size-4 " /> Loading open items…
              </p>
            ) : issues.length === 0 ? (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" /> No open issues — nothing to acknowledge.
              </p>
            ) : (
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li key={issue.id}>
                    <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={!!acked[issue.id]}
                        onCheckedChange={(v) => setAcked((prev) => ({ ...prev, [issue.id]: v === true }))}
                        className="mt-0.5"
                        aria-label={`Acknowledge: ${issue.title}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{issue.title}</span>
                        {issue.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">{issue.description}</span>
                        )}
                        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
                          {issue.type} • {issue.severity}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {issues && issues.length > 0 && !allAcked && (
              <p className="text-xs text-muted-foreground">Tick every item above to enable sign-off.</p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            disabled={!canConfirm}
            onClick={confirm}
          >
            <CheckCircle2 className="size-4" />
            {isPending ? "Signing off…" : "Confirm sign-off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
