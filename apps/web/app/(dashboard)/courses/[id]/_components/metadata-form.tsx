"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { CourseRow } from "@/lib/services/courses"
import { saveDraft } from "@/lib/workspace/actions"
import { metadataSchema, type MetadataFormValues } from "@/lib/workspace/schemas"
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
import { Textarea } from "@/components/ui/textarea"
import { useStoredTimerValue } from "./review-timer"

type MetadataFormProps = {
  course: CourseRow
  reviewerName: string
  defaultValues: MetadataFormValues
}

const TERMS = ["Fall 2025", "Winter 2026", "Spring 2026", "Summer 2026"]

export function MetadataForm({ course, reviewerName, defaultValues }: MetadataFormProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const overallElapsed = useStoredTimerValue(
    `coursebridge:${course.id}:timer:overall`,
    defaultValues.overall_time_spent_seconds ?? 0,
  )
  const form = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues,
  })

  async function handleSave(advance = false) {
    const valid = await form.trigger()
    if (!valid) return

    setStatus("saving")
    startTransition(async () => {
      try {
        await saveDraft(course.id, "course_metadata", {
          ...form.getValues(),
          overall_time_spent_seconds: overallElapsed,
        })
        setStatus("saved")
        if (advance) {
          router.push(`/courses/${course.id}/review-matrix`)
        }
      } catch {
        setStatus("error")
      }
    })
  }

  const sectionText = form.watch("section_numbers").join(", ")

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Course Metadata</CardTitle>
          <SaveState isPending={isPending} status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onBlur={() => void handleSave()}>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Course ID" value={course.id} />
            <ReadOnlyField label="Course Title" value={course.title} />
            <ReadOnlyField label="Reviewer" value={reviewerName} />
            <ReadOnlyField label="Review Date" value={new Date().toLocaleDateString("en-US")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Term
              <Controller
                control={form.control}
                name="term"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={form.formState.errors.term?.message} />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Section Numbers
              <Input
                onChange={(event) =>
                  form.setValue(
                    "section_numbers",
                    event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
                placeholder="001, 002"
                value={sectionText}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Brightspace URL
              <Input placeholder="https://..." {...form.register("brightspace_url")} />
              <FieldError message={form.formState.errors.brightspace_url?.message} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Moodle URL
              <Input placeholder="https://..." {...form.register("moodle_url")} />
              <FieldError message={form.formState.errors.moodle_url?.message} />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Migration Notes
            <Textarea rows={6} {...form.register("migration_notes")} />
            <FieldError message={form.formState.errors.migration_notes?.message} />
          </label>

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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <Input readOnly value={value} />
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
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
