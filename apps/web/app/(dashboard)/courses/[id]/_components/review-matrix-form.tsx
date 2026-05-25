"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { ChevronDown, Plus, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { saveDraft } from "@/lib/workspace/actions"
import {
  reviewMatrixSchema,
  type ReviewMatrixFormValues,
} from "@/lib/workspace/schemas"
import type { Issue, IssueLogResponseData, ReviewMatrixStatus } from "@/lib/workspace/types"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReviewTimer, useStoredTimerValue } from "./review-timer"
import { CHECKLIST } from "@/lib/workspace/constants"
import { clearUnsavedChanges, setUnsavedChanges } from "@/lib/deployment-sync"
import { cn } from "@/lib/utils"

type ReviewMatrixFormProps = {
  courseId: string
  defaultValues: ReviewMatrixFormValues
  initialIssues: Issue[]
}

const STATUS_OPTIONS: { value: ReviewMatrixStatus; label: string; color: string }[] = [
  { value: "pass",       label: "Pass",       color: "text-emerald-500" },
  { value: "fix_needed", label: "Fix Needed", color: "text-amber-500"   },
  { value: "missing",    label: "Missing",    color: "text-red-500"     },
  { value: "escalate",   label: "Escalate",   color: "text-orange-500"  },
  { value: "na",         label: "N/A",        color: "text-muted-foreground" },
]

const STATUS_DOT: Record<ReviewMatrixStatus, string> = {
  pass:       "bg-emerald-500",
  fix_needed: "bg-amber-500",
  missing:    "bg-red-500",
  escalate:   "bg-orange-500",
  na:         "bg-muted-foreground/30",
}

const NEEDS_ISSUE = new Set<ReviewMatrixStatus>(["fix_needed", "missing", "escalate"])

export function ReviewMatrixForm({
  courseId,
  defaultValues,
  initialIssues,
}: ReviewMatrixFormProps) {
  const dirtySource = `review-matrix-form:${courseId}`
  const localDraftKey = `coursebridge:${courseId}:local-draft:review_matrix`
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [issues, setIssues] = useState(initialIssues)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const timerStorageKey = `coursebridge:${courseId}:timer:review-matrix`
  const elapsedRef = useRef(defaultValues.time_spent_seconds ?? 0)
  const overallElapsed = useStoredTimerValue(
    `coursebridge:${courseId}:timer:overall`,
    defaultValues.overall_time_spent_seconds ?? 0,
  )
  const form = useForm<ReviewMatrixFormValues>({
    resolver: zodResolver(reviewMatrixSchema),
    defaultValues,
  })
  const watchedItems = useWatch({ control: form.control, name: "items" })

  useEffect(() => {
    const stored = window.localStorage.getItem(timerStorageKey)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (Number.isFinite(parsed)) elapsedRef.current = parsed
    }
    function onTick(e: Event) {
      const { storageKey, elapsed } = (e as CustomEvent<{ storageKey: string; elapsed: number }>).detail
      if (storageKey === timerStorageKey) elapsedRef.current = elapsed
    }
    window.addEventListener("coursebridge:review-timer", onTick)
    return () => window.removeEventListener("coursebridge:review-timer", onTick)
  }, [timerStorageKey])

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(localDraftKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Partial<ReviewMatrixFormValues>
      form.reset({ ...defaultValues, ...parsed }, { keepDefaultValues: false })
      setUnsavedChanges(dirtySource, true)
    } catch {
      localStorage.removeItem(localDraftKey)
    }
  }, [defaultValues, dirtySource, form, localDraftKey])

  useEffect(() => {
    const sub = form.watch((values) => {
      localStorage.setItem(localDraftKey, JSON.stringify(values))
    })
    return () => sub.unsubscribe()
  }, [form, localDraftKey])

  useEffect(() => {
    setUnsavedChanges(dirtySource, form.formState.isDirty)
    return () => clearUnsavedChanges(dirtySource)
  }, [dirtySource, form.formState.isDirty])

  async function handleSave(advance = false) {
    const valid = await form.trigger()
    if (!valid) return
    setStatus("saving")
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await saveDraft(courseId, "review_matrix", {
          ...form.getValues(),
          time_spent_seconds: elapsedRef.current,
          overall_time_spent_seconds: overallElapsed,
        })
        if (!res.ok) {
          setErrorMsg(res.error || "Failed to save draft.")
          setStatus("error")
          setTimeout(() => window.location.reload(), 2000)
          return
        }
        setStatus("saved")
        setTimeout(() => setStatus("idle"), 2500)
        localStorage.setItem(`coursebridge:${courseId}:form-done:review_matrix`, "1")
        window.dispatchEvent(new CustomEvent("coursebridge:form-saved"))
        localStorage.removeItem(localDraftKey)
        form.reset(form.getValues())
        if (advance) router.push(`/courses/${courseId}/syllabus-gradebook`)
      } catch (err) {
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      }
    })
  }

  function addIssue(itemId: string, itemLabel: string) {
    const nextIssue: Issue = {
      id: crypto.randomUUID(),
      type: "Review Matrix",
      location: itemId,
      severity: "major",
      owner: "TA",
      status: "open",
      description: itemLabel,
      direct_link: "",
      created_at: new Date().toISOString(),
    }
    const nextIssues = [...issues, nextIssue]
    setIssues(nextIssues)
    startTransition(async () => {
      try {
        const res = await saveDraft(courseId, "general_notes", { issues: nextIssues } satisfies IssueLogResponseData)
        if (!res.ok) {
          setErrorMsg(res.error || "Failed to save draft.")
          setStatus("error")
          setTimeout(() => window.location.reload(), 2000)
        }
      } catch (err) {
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      }
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Review Matrix</h2>
          <ReviewTimer storageKey={timerStorageKey} label="Time on this section" compact />
        </div>
        <SaveBadge isPending={isPending} status={status} />
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Course info strip */}
      <section className="space-y-1.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
          Course Details
        </p>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-card/45 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 md:grid-cols-3">
          <FieldStack label="Subject">
            <CleanInput placeholder="BUAD" {...form.register("subject")} />
          </FieldStack>
          <FieldStack label="Season">
            <CleanInput placeholder="Fall" {...form.register("season")} />
          </FieldStack>
          <FieldStack label="Year">
            <CleanInput placeholder="2026" {...form.register("year")} />
          </FieldStack>
        </div>
      </section>

      {/* Checklist sections */}
      <section className="space-y-1.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
          Checklist
        </p>
        <div className="space-y-3">
          {CHECKLIST.map((section) => {
            const sectionItems = section.items
            const sectionStatuses = sectionItems.map((item) => {
              const index = defaultValues.items.findIndex((v) => v.item_id === item.id)
              return (watchedItems[index]?.status ?? "na") as ReviewMatrixStatus
            })
            const passCount = sectionStatuses.filter((s) => s === "pass" || s === "na").length
            const totalCount = sectionItems.length

            return (
              <Collapsible defaultOpen key={section.title} className="group/coll relative">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/45 backdrop-blur-xl shadow-2xl shadow-black/20 pl-[3px]">
                  {/* Shifting Gradient Tint Bar on Left Side */}
                  <div className="absolute left-[1px] top-0 bottom-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 group-hover/coll:opacity-100 group-hover/coll:w-[4px] transition-all duration-300" />
                  <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{section.title}</span>
                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        {passCount}/{totalCount} reviewed
                      </span>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground/60 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-white/5 bg-black/10 overflow-x-auto">
                      {/* Column headers */}
                      <div className="grid grid-cols-[2fr_140px_1.5fr_1.5fr_120px] gap-0 border-b border-white/5 bg-white/[0.01] px-5 py-2">
                        {["Item", "Status", "Notes", "Direct Link", ""].map((h) => (
                          <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{h}</span>
                        ))}
                      </div>
                      {/* Rows */}
                      {section.items.map((item) => {
                        const index = defaultValues.items.findIndex((v) => v.item_id === item.id)
                        const statusValue = (watchedItems[index]?.status ?? "na") as ReviewMatrixStatus
                        const needsIssue = NEEDS_ISSUE.has(statusValue)

                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-[2fr_140px_1.5fr_1.5fr_120px] gap-0 items-center border-b border-white/5 px-5 py-3 last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Item */}
                            <div className="space-y-0.5 pr-3">
                              <span className="inline-block rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground/70">
                                {item.id}
                              </span>
                              <p className="text-[13px] text-foreground/80 leading-snug">{item.label}</p>
                            </div>
                            {/* Status */}
                            <div className="pr-3">
                              <Controller
                                control={form.control}
                                name={`items.${index}.status`}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-8 w-full rounded-lg border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-xs transition-all duration-200">
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn("size-1.5 rounded-full shrink-0", STATUS_DOT[field.value as ReviewMatrixStatus] ?? "bg-muted")} />
                                        <SelectValue />
                                      </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <div className="flex items-center gap-2">
                                            <span className={cn("size-1.5 rounded-full", STATUS_DOT[opt.value])} />
                                            <span className={opt.color}>{opt.label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            {/* Notes */}
                            <div className="pr-3">
                              <Input
                                placeholder="Optional"
                                className="h-8 rounded-lg border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-xs transition-all duration-200"
                                {...form.register(`items.${index}.notes`)}
                              />
                            </div>
                            {/* Direct Link */}
                            <div className="pr-3">
                              <Input
                                placeholder="https://…"
                                className="h-8 rounded-lg border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-xs transition-all duration-200"
                                {...form.register(`items.${index}.direct_link`)}
                              />
                            </div>
                            {/* Issue */}
                            <div className="flex justify-end">
                              {needsIssue ? (
                                <Button
                                  onClick={() => addIssue(item.id, item.label)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  className="h-7 rounded-lg border-primary/30 px-3 text-[11px] font-semibold hover:bg-primary/10"
                                >
                                  <Plus className="size-3 mr-1" />
                                  Issue
                                </Button>
                              ) : (
                                <span className="text-center text-xs text-muted-foreground/30">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      </section>

      {/* Action */}
      <div className="flex justify-end pt-1">
        <Button
          disabled={isPending}
          onClick={() => void handleSave(true)}
          type="button"
          className="h-11 rounded-xl px-6 text-sm font-bold uppercase tracking-wider border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 shadow-xl hover:border-white/30 text-white flex items-center gap-2 transition-all duration-300"
        >
          {isPending ? (
            <><Loader2 className="size-4 animate-spin" /> Saving…</>
          ) : (
            <>
              Save & Next
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function FieldStack({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

function CleanInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-9 rounded-xl border border-border/40 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/50",
        "outline-none transition-[border-color,box-shadow]",
        "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        props.className,
      )}
    />
  )
}

function SaveBadge({ isPending, status }: { isPending: boolean; status: "idle" | "saving" | "saved" | "error" }) {
  if (isPending || status === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    )
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-600">
        <CheckCircle2 className="size-3" /> Saved
      </span>
    )
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
        Save failed
      </span>
    )
  return (
    <span className="rounded-full bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground/60">
      Saved locally
    </span>
  )
}
