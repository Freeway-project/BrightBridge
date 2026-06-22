"use client"

import { useEffect, useState, useTransition } from "react"
import { CheckCircle2, Circle, Send, Sparkles, AlertCircle, RefreshCw } from "lucide-react"
import { getCourseStatusLabel, getStaffAdvance, getStaffAdvanceOptions, type CourseStatus } from "@coursebridge/workflow"
import { markProvisionComplete, markStagingComplete, submitReview } from "@/lib/workspace/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { SummaryNotesRows, parseSummaryRows, joinSummaryRows } from "@/components/shared/summary-notes-rows"
import { ReviewSummary } from "./review-summary"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

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
  latestChangeRequest?: {
    note: string | null
    actorName: string | null
    actorEmail: string
    createdAt: string
  } | null
  /** Current "Final Summary for Instructor" notes, pre-filled into the provision dialog. */
  instructorNotes?: string | null
}

export function SubmitPanel({ courseId, courseStatus, sections, reviewData, latestChangeRequest, instructorNotes }: SubmitPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resubmitNote, setResubmitNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [provisionRows, setProvisionRows] = useState<string[]>(() => parseSummaryRows(instructorNotes))

  const advance = getStaffAdvance(courseStatus)
  const provisionOption =
    getStaffAdvanceOptions(courseStatus).find((option) => option.action === "provision-complete") ?? null
  const isFinalize = advance?.action === "finalize-staging"
  const isResubmit = Boolean(advance?.requiresNote)
  const isStatusSubmittable = advance !== null
  // Section requirements only gate the review-submit path, not staging finalize.
  const blockers =
    advance?.action === "submit" ? sections.filter((section) => section.required && !section.complete) : []
  const resubmitNoteRequired = isResubmit && resubmitNote.trim().length === 0
  const disabled = blockers.length > 0 || isPending || !isStatusSubmittable || isSuccess || resubmitNoteRequired

  useEffect(() => {
    if (!isSuccess) return
    const timeout = window.setTimeout(() => {
      window.location.href = "/ta"
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [isSuccess])

  const handleSubmit = () => {
    if (!advance) {
      const message = `Cannot advance from current status: ${courseStatus.replaceAll("_", " ")}.`
      setErrorMsg(message)
      toast.error(message)
      return
    }
    // If marking ready for instructor but notes haven't been written yet,
    // send the TA to the Issues page to write them rather than blocking here.
    if (isFinalize && !instructorNotes?.trim()) {
      toast.info("Add instructor notes before marking ready — redirecting to Issues.")
      window.location.href = window.location.pathname.replace("/submit", "/issue-log")
      return
    }
    setConfirmOpen(true)
  }

  const runAdvance = () => {
    if (!advance) return
    setConfirmOpen(false)
    startTransition(async () => {
      setErrorMsg(null)
      const res =
        advance.action === "finalize-staging"
          ? await markStagingComplete(courseId, instructorNotes ?? "")
          : await submitReview(courseId, isResubmit ? resubmitNote.trim() : undefined)
      if (!res?.ok) {
        const message = res?.error || "Failed to advance."
        setErrorMsg(message)
        toast.error(message)
        return
      }

      setIsSuccess(true)
      toast.success(`${advance.ctaLabel} — done.`)
    })
  }

  const runProvision = () => {
    setProvisionOpen(false)
    startTransition(async () => {
      setErrorMsg(null)
      const res = await markProvisionComplete(courseId, joinSummaryRows(provisionRows) || undefined)
      if (!res?.ok) {
        const message = res?.error || "Failed to mark provision complete."
        setErrorMsg(message)
        toast.error(message)
        return
      }

      setIsSuccess(true)
      toast.success("Provision complete — course finalized.")
    })
  }

  return (
    <>
    <div className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6 lg:px-8 pb-20">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-4 py-20 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="size-10" />
              </div>
            </div>
            <h2 className="text-3xl font-black tracking-tight">Review Submitted!</h2>
            <p className="text-muted-foreground">Redirecting you back to the dashboard...</p>
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* Review Summary */}
            {reviewData && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Review Summary</h2>
                </div>
                <ReviewSummary {...reviewData} />
              </section>
            )}

            {/* Submission Logic */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Send className="size-4" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Final Submission</h2>
              </div>

              <div className="relative rounded-3xl border border-white/10 bg-card/25 backdrop-blur-2xl p-1.5 shadow-2xl shadow-black/30 transition-all hover:border-primary/30">
                <GlowingEffect
                  blur={0}
                  spread={40}
                  glow
                  disabled={disabled}
                  proximity={100}
                  inactiveZone={0.65}
                  borderWidth={1}
                />
                <Card className="relative overflow-hidden border-0 bg-card/45 backdrop-blur-xl shadow-none ring-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground/60">
                      Checklist & Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {sections.map((section) => (
                        <div 
                          key={section.key}
                          className={cn(
                            "group flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-300 shadow-sm",
                            section.complete 
                              ? "border-emerald-500/30 bg-emerald-500/[0.04] text-emerald-400 shadow-emerald-950/10" 
                              : section.required 
                                ? "border-amber-500/30 bg-amber-500/[0.04] text-amber-500 shadow-amber-950/10" 
                                : "border-white/5 bg-white/[0.01] hover:bg-white/[0.02] text-muted-foreground/80"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex size-6 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                              section.complete ? "bg-emerald-500/20" : "bg-muted/50"
                            )}>
                              {section.complete ? (
                                <CheckCircle2 className="size-3.5" />
                              ) : (
                                <Circle className="size-3.5" />
                              )}
                            </div>
                            <span className="text-sm font-bold tracking-tight">{section.label}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {section.complete ? "Done" : section.required ? "Required" : "Optional"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isResubmit && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-400">
                          <RefreshCw className="mt-0.5 size-5 shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-sm font-bold">Admin Requested Changes</p>
                            {latestChangeRequest?.note ? (
                              <div className="rounded-lg bg-amber-500/10 px-3 py-2">
                                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                  {latestChangeRequest.actorName ?? latestChangeRequest.actorEmail ?? "Admin"} wrote:
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium opacity-95">
                                  {latestChangeRequest.note}
                                </p>
                              </div>
                            ) : null}
                            <p className="text-xs font-medium opacity-90">Describe what you fixed before resubmitting so the admin knows what changed.</p>
                          </div>
                        </div>
                        <Textarea
                          placeholder="What did you fix or update? (required)"
                          value={resubmitNote}
                          onChange={(e) => setResubmitNote(e.target.value)}
                          rows={3}
                          className="resize-none rounded-xl border-amber-500/30 bg-amber-500/5 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-amber-500/40"
                        />
                      </div>
                    )}

                    <div className="space-y-4">
                      {blockers.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-700 dark:text-orange-400"
                        >
                          <AlertCircle className="mt-0.5 size-5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold">Action Required</p>
                            <p className="text-xs font-medium opacity-90">Please complete the required sections before submitting your review.</p>
                          </div>
                        </motion.div>
                      )}

                      {!isStatusSubmittable && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-500">
                          <AlertCircle className="mt-0.5 size-5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold">Nothing to do here right now</p>
                            <p className="text-xs font-medium opacity-90">This course is currently <span className="font-bold">{getCourseStatusLabel(courseStatus)}</span> — there is no staff action for this step.</p>
                          </div>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-700">
                          <AlertCircle className="mt-0.5 size-5 shrink-0" />
                          <p className="text-xs font-bold">{errorMsg}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {provisionOption ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
                          <AlertCircle className="mt-0.5 size-5 shrink-0" />
                          <p className="text-sm font-medium">
                            Hand this course to the instructor for review, or mark it{" "}
                            <span className="font-bold">provision complete</span> to finish it now.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-muted-foreground">
                          By submitting, you confirm that all review criteria have been met according to the guidelines.
                        </p>
                      )}
                      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        {provisionOption && (
                          <Button
                            variant="outline"
                            disabled={isPending || isSuccess}
                            onClick={() => setProvisionOpen(true)}
                            size="lg"
                            className="h-14 w-full rounded-2xl px-6 text-sm font-black uppercase tracking-[0.12em] border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 sm:w-auto"
                          >
                            {provisionOption.ctaLabel}
                            <CheckCircle2 className="ml-2 size-5" />
                          </Button>
                        )}
                        <Button
                          disabled={disabled}
                          onClick={handleSubmit}
                          size="lg"
                          className={cn(
                            "h-14 w-full rounded-2xl px-8 text-base font-black uppercase tracking-[0.15em] transition-all duration-500 sm:w-auto sm:min-w-[200px]",
                            !disabled && isResubmit
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-1 active:scale-95"
                              : !disabled && "bg-gradient-to-r from-blue-600 to-violet-600 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:scale-95"
                          )}
                        >
                          {isPending ? (
                            "Working…"
                          ) : (
                            <>
                              {advance?.ctaLabel ?? "Submit Review"}
                              {isResubmit ? <RefreshCw className="ml-2 size-5" /> : <Send className="ml-2 size-5" />}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm this step</DialogTitle>
          <DialogDescription>
            {advance
              ? `This moves the course to "${getCourseStatusLabel(advance.to)}". You can't undo this from here.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={runAdvance} disabled={isPending}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark provision complete</DialogTitle>
          <DialogDescription>
            This finalizes the course as <span className="font-semibold">{getCourseStatusLabel("final_approved")}</span> and
            skips instructor review entirely. You can&apos;t undo this from here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Instructor notes <span className="text-muted-foreground">(optional)</span>
          </p>
          <SummaryNotesRows
            rows={provisionRows}
            onChange={setProvisionRows}
            disabled={isPending}
            placeholder="Anything the instructor should know about this course…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setProvisionOpen(false)}>
            Cancel
          </Button>
          <Button onClick={runProvision} disabled={isPending}>
            Confirm provision complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
