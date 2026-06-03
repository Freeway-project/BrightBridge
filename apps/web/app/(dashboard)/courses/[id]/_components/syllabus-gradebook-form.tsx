"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { saveDraft } from "@/lib/workspace/actions"
import {
  syllabusGradebookSchema,
  type SyllabusGradebookFormValues,
} from "@/lib/workspace/schemas"
import type { ReviewMatrixStatus, SyllabusRowStatus } from "@/lib/workspace/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReviewTimer, useStoredTimerValue } from "./review-timer"
import { SYLLABUS_ITEMS_LIST as SYLLABUS_ITEMS, GRADEBOOK_ITEMS_LIST as GRADEBOOK_ITEMS } from "@/lib/workspace/constants"
import { clearUnsavedChanges, setUnsavedChanges } from "@/lib/deployment-sync"
import { cn } from "@/lib/utils"

type SyllabusGradebookFormProps = {
  courseId: string
  defaultValues: SyllabusGradebookFormValues
}

const SYLLABUS_STATUS_OPTIONS: { value: SyllabusRowStatus; label: string; color: string }[] = [
  { value: "pending",    label: "Pending",    color: "text-muted-foreground" },
  { value: "confirmed",  label: "Confirmed",  color: "text-emerald-500"      },
  { value: "fix_needed", label: "Fix Needed", color: "text-amber-500"        },
]

const REVIEW_STATUS_OPTIONS: { value: ReviewMatrixStatus; label: string; color: string }[] = [
  { value: "pass",       label: "Pass",       color: "text-emerald-500"      },
  { value: "fix_needed", label: "Fix Needed", color: "text-amber-500"        },
  { value: "missing",    label: "Missing",    color: "text-red-500"          },
  { value: "escalate",   label: "Escalate",   color: "text-orange-500"       },
  { value: "na",         label: "N/A",        color: "text-muted-foreground" },
]

const SYLLABUS_DOT: Record<SyllabusRowStatus, string> = {
  pending:    "bg-muted-foreground/30",
  confirmed:  "bg-emerald-500",
  fix_needed: "bg-amber-500",
}

const REVIEW_DOT: Record<ReviewMatrixStatus, string> = {
  pass:       "bg-emerald-500",
  fix_needed: "bg-amber-500",
  missing:    "bg-red-500",
  escalate:   "bg-orange-500",
  na:         "bg-muted-foreground/30",
}

export function SyllabusGradebookForm({ courseId, defaultValues }: SyllabusGradebookFormProps) {
  const dirtySource = `syllabus-gradebook-form:${courseId}`
  const localDraftKey = `coursebridge:${courseId}:local-draft:syllabus_review`
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const timerStorageKey = `coursebridge:${courseId}:timer:syllabus-gradebook`
  const elapsedRef = useRef(defaultValues.time_spent_seconds ?? 0)
  const overallElapsed = useStoredTimerValue(
    `coursebridge:${courseId}:timer:overall`,
    defaultValues.overall_time_spent_seconds ?? 0,
  )
  const form = useForm<SyllabusGradebookFormValues>({
    resolver: zodResolver(syllabusGradebookSchema),
    defaultValues,
  })

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

  useEffect(() => {
    setUnsavedChanges(dirtySource, form.formState.isDirty)
    return () => clearUnsavedChanges(dirtySource)
  }, [dirtySource, form.formState.isDirty])

  useEffect(() => {
    const stored = localStorage.getItem(localDraftKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Partial<SyllabusGradebookFormValues>
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

  async function handleSave(advance = false) {
    const valid = await form.trigger()
    if (!valid) return
    setStatus("saving")
    startTransition(async () => {
      try {
        const res = await saveDraft(courseId, "syllabus_review", {
          ...form.getValues(),
          time_spent_seconds: elapsedRef.current,
          overall_time_spent_seconds: overallElapsed,
        })
        if (!res.ok) { setStatus("error"); return }
        setStatus("saved")
        setTimeout(() => setStatus("idle"), 2500)
        localStorage.setItem(`coursebridge:${courseId}:form-done:syllabus_review`, "1")
        window.dispatchEvent(new CustomEvent("coursebridge:form-saved"))
        localStorage.removeItem(localDraftKey)
        form.reset(form.getValues())
        if (advance) router.push(`/courses/${courseId}/issue-log`)
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Syllabus & Gradebook</h2>
          <ReviewTimer storageKey={timerStorageKey} label="Time on this section" compact />
        </div>
        <SaveBadge isPending={isPending} status={status} />
      </div>

      {/* Syllabus Review */}
      <ReviewTable
        label="Syllabus Review"
        columns={["Item", "TA Status", "Admin Status", "Notes"]}
      >
        {SYLLABUS_ITEMS.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-[2fr_140px_130px_1.5fr] items-center border-b border-border/40 px-5 py-3.5 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <div className="space-y-0.5 pr-3">
              <span className="inline-block rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground/70">
                {item.id}
              </span>
              <p className="text-[13px] text-foreground/80 leading-snug">{item.label}</p>
            </div>
            <div className="pr-3">
              <Controller
                control={form.control}
                name={`syllabus_items.${index}.ta_status`}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background/60 hover:bg-background/80 text-xs transition-all duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 rounded-full shrink-0", SYLLABUS_DOT[field.value as SyllabusRowStatus] ?? "bg-muted")} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {SYLLABUS_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn("size-1.5 rounded-full", SYLLABUS_DOT[opt.value])} />
                            <span className={opt.color}>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="pr-3">
              <span className="inline-flex items-center rounded-full bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/60">
                Pending Admin
              </span>
            </div>
            <div>
              <Input
                placeholder="Notes…"
                className="h-9 rounded-lg border-border bg-background/60 hover:bg-background/80 text-xs transition-all duration-200"
                {...form.register(`syllabus_items.${index}.notes`)}
              />
            </div>
          </div>
        ))}
      </ReviewTable>

      {/* Gradebook Review */}
      <ReviewTable
        label="Gradebook Review"
        columns={["Item", "Status", "Notes", "Direct Link"]}
      >
        {GRADEBOOK_ITEMS.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-[2fr_140px_1.5fr_1.5fr] items-center border-b border-border/40 px-5 py-3.5 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <div className="space-y-0.5 pr-3">
              <span className="inline-block rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground/70">
                {item.id}
              </span>
              <p className="text-[13px] text-foreground/80 leading-snug">{item.label}</p>
            </div>
            <div className="pr-3">
              <Controller
                control={form.control}
                name={`gradebook_items.${index}.status`}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background/60 hover:bg-background/80 text-xs transition-all duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 rounded-full shrink-0", REVIEW_DOT[field.value as ReviewMatrixStatus] ?? "bg-muted")} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn("size-1.5 rounded-full", REVIEW_DOT[opt.value])} />
                            <span className={opt.color}>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="pr-3">
              <Input
                placeholder="Notes…"
                className="h-9 rounded-lg border-border bg-background/60 hover:bg-background/80 text-xs transition-all duration-200"
                {...form.register(`gradebook_items.${index}.notes`)}
              />
            </div>
            <div>
              <Input
                placeholder="https://…"
                className="h-9 rounded-lg border-border bg-background/60 hover:bg-background/80 text-xs transition-all duration-200"
                {...form.register(`gradebook_items.${index}.direct_link`)}
              />
            </div>
          </div>
        ))}
      </ReviewTable>

      {/* Action */}
      <div className="flex justify-end pt-1">
        <Button
          disabled={isPending}
          onClick={() => void handleSave(true)}
          type="button"
          className="h-11 rounded-xl px-6 text-sm font-bold uppercase tracking-wider border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 shadow-xl hover:border-white/30 text-white flex items-center gap-2 transition-all duration-300"
        >
          {isPending ? (
            <><LottieLoader className="size-4 " /> Saving…</>
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

function ReviewTable({
  label,
  columns,
  children,
}: {
  label: string
  columns: string[]
  children: React.ReactNode
}) {
  return (
    <Card className="relative overflow-hidden group/tbl border-border/70 bg-card/60 backdrop-blur-xl shadow-lg rounded-2xl pl-[3px]">
      {/* Shifting Gradient Tint Bar on Left Side */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 group-hover/tbl:opacity-100 group-hover/tbl:w-[4px] transition-all duration-300 z-10" />
      <CardHeader className="bg-muted/10 px-6 py-4 border-b border-border/40">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Column headers */}
        <div
          className="grid items-center border-b border-border/40 bg-muted/20 px-5 py-2"
          style={{ gridTemplateColumns: columns.length === 4 ? "2fr 140px 1.5fr 1.5fr" : "2fr 140px 130px 1.5fr" }}
        >
          {columns.map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{h}</span>
          ))}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function SaveBadge({ isPending, status }: { isPending: boolean; status: "idle" | "saving" | "saved" | "error" }) {
  if (isPending || status === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <LottieLoader className="size-3 " /> Saving…
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
