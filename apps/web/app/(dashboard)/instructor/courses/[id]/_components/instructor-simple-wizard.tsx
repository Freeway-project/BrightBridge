"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  MessageCircleQuestion,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Eye,
  Info,
} from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { LottieLoader } from "@/components/ui/lottie-loader"
import { getIssuesForCourseAction } from "@/lib/issues/actions"
import type { CourseIssue } from "@/lib/issues/types"
import { getInstructorSimpleState } from "@/lib/courses/instructor-view"
import { instructorSignOffAction } from "../actions"

const STEP_TITLES = ["Look at your course", "Have any questions?", "Approve the course"]

interface Props {
  courseId: string
  status: CourseStatus
  finalSummary: string | null
  readOnly: boolean
  /** Server-rendered review summary (InstructorReviewDetail). */
  reviewNode: ReactNode
  /** Controlled step (0-2) so the guided tour can drive the wizard. */
  step: number
  onStepChange: (step: number) => void
  onRequestChat?: () => void
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${active + 1} of ${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={
            i === active
              ? "size-2.5 rounded-full bg-primary"
              : i < active
                ? "size-2.5 rounded-full bg-primary/40"
                : "size-2.5 rounded-full bg-muted-foreground/25"
          }
          aria-hidden
        />
      ))}
    </div>
  )
}

export function InstructorSimpleWizard({
  courseId,
  status,
  finalSummary,
  readOnly,
  reviewNode,
  step,
  onStepChange,
  onRequestChat,
}: Props) {
  const router = useRouter()
  const { canAsk, canApprove, statusMessage } = getInstructorSimpleState(status, readOnly)
  const isWizard = canAsk && canApprove

  const [issues, setIssues] = useState<CourseIssue[] | null>(null)
  const [acked, setAcked] = useState(false)
  const [signPending, startSign] = useTransition()

  useEffect(() => {
    if (!canApprove) return
    let active = true
    getIssuesForCourseAction(courseId, { status: "open" })
      .then((rows) => active && setIssues(rows))
      .catch(() => active && setIssues([]))
    return () => {
      active = false
    }
  }, [courseId, canApprove])

  const confirmSignOff = () => {
    if (!acked) return
    startSign(async () => {
      await instructorSignOffAction(courseId, (issues ?? []).map((i) => i.id))
      router.refresh()
    })
  }

  // Read-only / non-actionable: show status message + review only
  if (!isWizard) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-2">
        {readOnly ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Eye className="size-4 shrink-0" aria-hidden />
            You&apos;re viewing this course. Only the assigned instructor can approve it.
          </div>
        ) : statusMessage ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-base font-medium text-foreground">
            <Info className="size-5 shrink-0 text-primary" aria-hidden />
            {statusMessage}
          </div>
        ) : null}
        <div data-tour="review-summary">{reviewNode}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-2">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{STEP_TITLES[step]}</h2>
        <ProgressDots count={3} active={step} />
      </div>

      {/* Step 1 — read the review */}
      {step === 0 && (
        <div className="space-y-6">
          <p className="text-base text-muted-foreground">
            Here&apos;s what our reviewer checked on your migrated course.{" "}
            <span className="font-medium text-foreground">Green</span> means it looks good;{" "}
            <span className="font-medium text-foreground">orange</span> means they flagged something.
          </p>
          <div data-tour="review-summary">{reviewNode}</div>
          <div className="flex justify-end">
            <Button size="lg" className="h-12 gap-2 px-6 text-base" onClick={() => onStepChange(1)}>
              Next <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — questions */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-base text-muted-foreground">
            Is there anything you&apos;re unsure about, or would like changed?
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-5 text-left"
              onClick={() => onStepChange(2)}
            >
              <span className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="size-5 text-green-600" /> No, it looks fine
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Continue to approve the course.
              </span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              data-tour="ask-question"
              className="h-auto flex-col items-start gap-1 p-5 text-left"
              onClick={() => onRequestChat?.()}
            >
              <span className="flex items-center gap-2 text-base font-semibold">
                <MessageCircleQuestion className="size-5 text-primary" /> Yes, I have a question
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Open the chat to message the reviewer team.
              </span>
            </Button>
          </div>

          <div className="flex justify-start">
            <Button variant="ghost" className="gap-2" onClick={() => onStepChange(0)}>
              <ArrowLeft className="size-5" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — approve */}
      {step === 2 && (
        <div className="space-y-6">
          <section className="space-y-2 rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-semibold">A note from the reviewer</h3>
            </div>
            {finalSummary?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{finalSummary}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No note was left.</p>
            )}
          </section>

          {issues === null ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <LottieLoader className="size-4" /> Checking for open items…
            </p>
          ) : issues.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">The reviewer noted:</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {issues.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium">{i.title}</span>
                    {i.description ? (
                      <span className="text-muted-foreground"> — {i.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-green-600" /> No open items on this course.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/40">
            <Checkbox
              checked={acked}
              onCheckedChange={(v) => setAcked(v === true)}
              className="mt-0.5"
              aria-label="Confirm you've reviewed and approve"
            />
            <span className="text-base font-medium">
              I&apos;ve reviewed everything and approve this course.
            </span>
          </label>

          <div className="flex items-center justify-between">
            <Button variant="ghost" className="gap-2" onClick={() => onStepChange(1)} disabled={signPending}>
              <ArrowLeft className="size-5" /> Back
            </Button>
            <Button
              size="lg"
              data-tour="approve"
              className="h-12 gap-2 bg-green-600 px-6 text-base text-white hover:bg-green-700"
              disabled={!acked || signPending || issues === null}
              onClick={confirmSignOff}
            >
              <CheckCircle2 className="size-5" />
              {signPending ? "Approving…" : "Approve this course"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
