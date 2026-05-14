"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { ChevronDown, Plus } from "lucide-react"
import { saveDraft } from "@/lib/workspace/actions"
import {
  reviewMatrixSchema,
  type ReviewMatrixFormValues,
} from "@/lib/workspace/schemas"
import type { Issue, IssueLogResponseData, ReviewMatrixStatus } from "@/lib/workspace/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReviewTimer, useStoredTimerValue } from "./review-timer"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { CHECKLIST } from "@/lib/workspace/constants"
import { clearUnsavedChanges, setUnsavedChanges } from "@/lib/deployment-sync"

type ReviewMatrixFormProps = {
  courseId: string
  defaultValues: ReviewMatrixFormValues
  initialIssues: Issue[]
}

const STATUS_OPTIONS: { value: ReviewMatrixStatus; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fix_needed", label: "Fix Needed" },
  { value: "missing", label: "Missing" },
  { value: "escalate", label: "Escalate" },
  { value: "na", label: "N/A" },
]

const NEEDS_ISSUE = new Set<ReviewMatrixStatus>(["fix_needed", "missing", "escalate"])

export function ReviewMatrixForm({
  courseId,
  defaultValues,
  initialIssues,
}: ReviewMatrixFormProps) {
  const dirtySource = `review-matrix-form:${courseId}`;
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

  // Single subscription for the whole items array — replaces per-row form.watch() calls
  const watchedItems = useWatch({ control: form.control, name: "items" })

  useEffect(() => {
    // Restore elapsed from localStorage on mount
    const stored = window.localStorage.getItem(timerStorageKey)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (Number.isFinite(parsed)) elapsedRef.current = parsed
    }
    // Keep ref in sync as timer ticks
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
    setUnsavedChanges(dirtySource, form.formState.isDirty);
    return () => clearUnsavedChanges(dirtySource);
  }, [dirtySource, form.formState.isDirty]);

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
        if (advance) {
          router.push(`/courses/${courseId}/syllabus-gradebook`)
        }
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
          return
        }
      } catch (err) {
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      }
    })
  }

  return (
    <div className="relative rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
      <GlowingEffect
        blur={0}
        spread={28}
        glow
        disabled={false}
        proximity={72}
        inactiveZone={0.65}
        borderWidth={1}
      />
      <Card className="relative border-0 bg-background/90 shadow-none ring-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">Review Matrix</CardTitle>
            <ReviewTimer storageKey={timerStorageKey} label="Review Matrix Time" compact />
          </div>
          <SaveState isPending={isPending} status={status} />
        </div>
      </CardHeader>
      <CardContent>
        {errorMsg ? (
          <p className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        ) : null}
        <form className="space-y-3">
          <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Subject
              <Input placeholder="BUAD" {...form.register("subject")} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Season
              <Input placeholder="Fall" {...form.register("season")} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Year
              <Input placeholder="2026" {...form.register("year")} />
            </label>
          </div>

          {CHECKLIST.map((section) => (
            <Collapsible defaultOpen key={section.title}>
              <div className="rounded-lg border border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                  {section.title}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[42%]">Item</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Direct Link</TableHead>
                        <TableHead className="w-[136px] text-right">Issue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.items.map((item) => {
                        const index = defaultValues.items.findIndex((value) => value.item_id === item.id)
                        const statusValue = (watchedItems[index]?.status ?? "na") as ReviewMatrixStatus
                        const needsIssue = NEEDS_ISSUE.has(statusValue)

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline">{item.id}</Badge>
                                <p className="text-sm">{item.label}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Controller
                                control={form.control}
                                name={`items.${index}.status`}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional"
                                {...form.register(`items.${index}.notes`)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input placeholder="https://..." {...form.register(`items.${index}.direct_link`)} />
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              {needsIssue ? (
                                <Button
                                  onClick={() => addIssue(item.id, item.label)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  className="h-8 min-w-[92px] shrink-0 border-primary/30 bg-background text-foreground hover:bg-primary/10"
                                >
                                  <Plus className="size-4" />
                                  Issue
                                </Button>
                              ) : (
                                <span className="inline-block w-[92px] text-center text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </CollapsibleContent>
              </div>
          </Collapsible>
          ))}

          <div className="flex justify-end pt-2">
            <Button disabled={isPending} onClick={() => void handleSave(true)} type="button">
              Save draft
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>
    </div>
  )
}


function SaveState({
  isPending,
  status,
}: {
  isPending: boolean
  status: "idle" | "saving" | "saved" | "error"
}) {
  if (isPending || status === "saving") return <p className="text-xs text-muted-foreground">Saving...</p>
  if (status === "saved") return <p className="text-xs text-green-600">Saved</p>
  if (status === "error") return <p className="text-xs text-destructive">Save failed</p>
  return <p className="text-xs text-muted-foreground">Saved locally until you click Save draft</p>
}
