"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { saveDraft } from "@/lib/workspace/actions"
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
import type { ProfileOption } from "@/lib/services/profiles"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReviewTimer, useStoredTimerValue } from "./review-timer"
import { SYLLABUS_ITEMS_LIST as SYLLABUS_ITEMS, GRADEBOOK_ITEMS_LIST as GRADEBOOK_ITEMS } from "@/lib/workspace/constants"

type SyllabusGradebookFormProps = {
  courseId: string
  defaultValues: SyllabusGradebookFormValues
  instructors: ProfileOption[]
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
  instructors,
}: SyllabusGradebookFormProps) {
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

  async function handleSave(advance = false) {
    const valid = await form.trigger()
    if (!valid) return

    setStatus("saving")
    startTransition(async () => {
      try {
        await saveDraft(courseId, "syllabus_review", {
          ...form.getValues(),
          time_spent_seconds: elapsedRef.current,
          overall_time_spent_seconds: overallElapsed,
        })
        setStatus("saved")
        if (advance) {
          router.push(`/courses/${courseId}/issue-log`)
        }
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <Card>
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
        <form className="space-y-6" onBlur={() => void handleSave()}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Instructor
              <Controller
                control={form.control}
                name="instructor_id"
                render={({ field }) => (
                  <Select
                    disabled={instructors.length === 0}
                    onValueChange={(value) => {
                      field.onChange(value)
                      const instructor = instructors.find((item) => item.id === value)
                      form.setValue("instructor_email", instructor?.email ?? "", {
                        shouldDirty: true,
                      })
                    }}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full" disabled={instructors.length === 0}>
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.fullName ?? instructor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {instructors.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No instructor profiles found in Supabase.
                </p>
              ) : null}
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Instructor Email
              <Input readOnly {...form.register("instructor_email")} />
            </label>
          </div>

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

export function buildSyllabusGradebookDefaults(
  saved?: Partial<SyllabusGradebookFormValues> | null,
): SyllabusGradebookFormValues {
  const savedSyllabus = new Map((saved?.syllabus_items ?? []).map((item) => [item.item_id, item]))
  const savedGradebook = new Map((saved?.gradebook_items ?? []).map((item) => [item.item_id, item]))

  return {
    instructor_id: saved?.instructor_id ?? "",
    instructor_email: saved?.instructor_email ?? "",
    syllabus_items: SYLLABUS_ITEMS.map((item) => ({
      item_id: item.id,
      ta_status: savedSyllabus.get(item.id)?.ta_status ?? "pending",
      notes: savedSyllabus.get(item.id)?.notes ?? "",
      direct_link: savedSyllabus.get(item.id)?.direct_link ?? "",
    })),
    gradebook_items: GRADEBOOK_ITEMS.map((item) => ({
      item_id: item.id,
      status: savedGradebook.get(item.id)?.status ?? "na",
      notes: savedGradebook.get(item.id)?.notes ?? "",
      direct_link: savedGradebook.get(item.id)?.direct_link ?? "",
    })),
    time_spent_seconds: saved?.time_spent_seconds ?? 0,
    overall_time_spent_seconds: saved?.overall_time_spent_seconds ?? 0,
  }
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
  return <p className="text-xs text-muted-foreground">Auto-saves on blur</p>
}
