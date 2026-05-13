"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { saveDraft } from "@/lib/workspace/actions"
import { Meteors } from "@/components/ui/meteors"
import {
  syllabusGradebookSchema,
  type SyllabusGradebookFormValues,
} from "@/lib/workspace/schemas"
import type { ReviewMatrixStatus, SyllabusRowStatus } from "@/lib/workspace/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReviewTimer, useStoredTimerValue } from "./review-timer"
import { SYLLABUS_ITEMS_LIST as SYLLABUS_ITEMS, GRADEBOOK_ITEMS_LIST as GRADEBOOK_ITEMS } from "@/lib/workspace/constants"
import { clearUnsavedChanges, setUnsavedChanges } from "@/lib/deployment-sync"

type SyllabusGradebookFormProps = {
  courseId: string
  defaultValues: SyllabusGradebookFormValues
}

const SYLLABUS_STATUS_OPTIONS: { value: SyllabusRowStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fix_needed", label: "Fix Needed" },
]

const REVIEW_STATUS_OPTIONS: { value: ReviewMatrixStatus; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fix_needed", label: "Fix Needed" },
  { value: "missing", label: "Missing" },
  { value: "escalate", label: "Escalate" },
  { value: "na", label: "N/A" },
]

export function SyllabusGradebookForm({
  courseId,
  defaultValues,
}: SyllabusGradebookFormProps) {
  const dirtySource = `syllabus-gradebook-form:${courseId}`;
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
    setUnsavedChanges(dirtySource, form.formState.isDirty);
    return () => clearUnsavedChanges(dirtySource);
  }, [dirtySource, form.formState.isDirty]);

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
        if (!res.ok) {
          setStatus("error")
          return
        }
        setStatus("saved")
        setTimeout(() => setStatus("idle"), 2500)
        localStorage.removeItem(localDraftKey)
        form.reset(form.getValues())
        if (advance) {
          router.push(`/courses/${courseId}/issue-log`)
        }
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <Card className="relative overflow-hidden">
      {status === "saved" && <Meteors number={14} className="opacity-50" />}
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">Syllabus & Gradebook</CardTitle>
            <ReviewTimer storageKey={timerStorageKey} label="Syllabus & Gradebook Time" compact />
          </div>
          <SaveState isPending={isPending} status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Syllabus Review</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[160px]">TA Status</TableHead>
                  <TableHead className="w-[150px]">Admin Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SYLLABUS_ITEMS.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.id}</Badge>
                      <p className="mt-1 text-sm">{item.label}</p>
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`syllabus_items.${index}.ta_status`}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SYLLABUS_STATUS_OPTIONS.map((option) => (
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
                      <Badge variant="secondary">Pending Admin</Badge>
                    </TableCell>
                    <TableCell>
                      <Input {...form.register(`syllabus_items.${index}.notes`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Gradebook Review</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[160px]">Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Direct Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {GRADEBOOK_ITEMS.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.id}</Badge>
                      <p className="mt-1 text-sm">{item.label}</p>
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`gradebook_items.${index}.status`}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REVIEW_STATUS_OPTIONS.map((option) => (
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
                      <Input {...form.register(`gradebook_items.${index}.notes`)} />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="https://..." {...form.register(`gradebook_items.${index}.direct_link`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <div className="flex justify-end">
            <Button disabled={isPending} onClick={() => void handleSave(true)} type="button">
              Save draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
