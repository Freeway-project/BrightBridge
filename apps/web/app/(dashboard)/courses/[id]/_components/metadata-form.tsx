"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { clearUnsavedChanges, setUnsavedChanges } from "@/lib/deployment-sync"
import { CopyButton } from "@/components/ui/copy-button"
import { FormFieldWrapper } from "./form-field-wrapper"
import { MovingBorderContainer } from "@/components/ui/moving-border"
import { Meteors } from "@/components/ui/meteors"

type MetadataFormProps = {
  course: CourseRow
  reviewerName: string
  defaultValues: MetadataFormValues
}

const SEASONS = ["Fall", "Winter", "Spring", "Summer"]
const YEARS = Array.from({ length: new Date().getFullYear() - 2011 + 3 }, (_, i) =>
  String(2011 + i)
).reverse()

function parseTerm(term: string): { season: string; year: string } {
  const parts = term.trim().split(" ")
  if (parts.length === 2 && SEASONS.includes(parts[0])) {
    return { season: parts[0], year: parts[1] }
  }
  return { season: parts[0] ?? "", year: parts[1] ?? "" }
}

export function MetadataForm({ course, reviewerName, defaultValues }: MetadataFormProps) {
  const dirtySource = `metadata-form:${course.id}`;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const router = useRouter()
  const parsed = parseTerm(defaultValues.term ?? "")
  const [termSeason, setTermSeason] = useState(parsed.season)
  const [termYear, setTermYear] = useState(parsed.year)
  const overallElapsed = useStoredTimerValue(
    `coursebridge:${course.id}:timer:overall`,
    defaultValues.overall_time_spent_seconds ?? 0,
  )
  const form = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues,
  })

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setUnsavedChanges(dirtySource, form.formState.isDirty);
    return () => clearUnsavedChanges(dirtySource);
  }, [dirtySource, form.formState.isDirty]);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`coursebridge:${course.id}:local-draft:course_metadata`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<MetadataFormValues>;
      form.reset({ ...defaultValues, ...parsed }, { keepDefaultValues: false });
      if (parsed.term) {
        const { season, year } = parseTerm(parsed.term);
        setTermSeason(season);
        setTermYear(year);
      }
      // Mark as having unsaved changes since localStorage has a draft
      setUnsavedChanges(dirtySource, true);
    } catch {
      localStorage.removeItem(`coursebridge:${course.id}:local-draft:course_metadata`);
    }
  }, []); // run once on mount

  // Write to localStorage on every change
  useEffect(() => {
    const sub = form.watch((values) => {
      localStorage.setItem(
        `coursebridge:${course.id}:local-draft:course_metadata`,
        JSON.stringify(values),
      );
    });
    return () => sub.unsubscribe();
  }, [form, course.id]);

  // Save only — called manually via "Save & Next" button
  async function performSave() {
    const valid = await form.trigger()
    if (!valid) return false

    setStatus("saving")
    setErrorMsg(null)
    try {
      const res = await saveDraft(course.id, "course_metadata", {
        ...form.getValues(),
        overall_time_spent_seconds: overallElapsed,
      })
      if (!res.ok) {
        setErrorMsg(res.error || "Failed to save draft.")
        setStatus("error")
        return false
      }
      localStorage.removeItem(`coursebridge:${course.id}:local-draft:course_metadata`)
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2500)
      localStorage.setItem(`coursebridge:${course.id}:form-done:course_metadata`, "1")
      form.reset(form.getValues())
      return true
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      return false
    }
  }

  // Navigate to next step after saving
  async function handleAdvance() {
    const ok = await performSave()
    if (ok) {
      router.push(`/courses/${course.id}/review-matrix`)
    }
  }

  const sectionNumbers = useWatch({ control: form.control, name: "section_numbers" })
  const sectionText = sectionNumbers.join(", ")
  const brightspaceUrl = useWatch({ control: form.control, name: "brightspace_url" })
  const moodleUrl = useWatch({ control: form.control, name: "moodle_url" })

  return (
    <MovingBorderContainer containerClassName="max-w-3xl" className="overflow-hidden shadow-xl shadow-primary/5">
      <Card className="relative border-0 bg-transparent shadow-none ring-0">
        {status === "saved" && <Meteors number={18} className="bg-indigo-400" />}
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Course Metadata</CardTitle>
          <SaveState status={status} />
        </div>
      </CardHeader>
      <CardContent>
        {errorMsg ? (
          <p className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        ) : null}
        <form className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Course ID" value={course.id} />
            <ReadOnlyField label="Course Title" value={course.title} />
            <ReadOnlyField label="Reviewer" value={reviewerName} />
            <ReadOnlyField label="Review Date" value={new Date().toLocaleDateString("en-US")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Term
              <div className="flex gap-2">
                <Controller
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <Select
                      onValueChange={(season) => {
                        setTermSeason(season)
                        field.onChange(`${season} ${termYear}`.trim())
                      }}
                      value={termSeason}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Select
                  onValueChange={(year) => {
                    setTermYear(year)
                    form.setValue("term", `${termSeason} ${year}`.trim(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                  value={termYear}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <FormFieldWrapper
              label="Brightspace URL"
              value={brightspaceUrl}
              error={form.formState.errors.brightspace_url?.message}
            >
              <Input placeholder="https://..." {...form.register("brightspace_url")} />
            </FormFieldWrapper>
            <FormFieldWrapper
              label="Moodle URL"
              value={moodleUrl}
              error={form.formState.errors.moodle_url?.message}
            >
              <Input placeholder="https://..." {...form.register("moodle_url")} />
            </FormFieldWrapper>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Migration Notes
            <Textarea rows={6} {...form.register("migration_notes")} />
            <FieldError message={form.formState.errors.migration_notes?.message} />
          </label>

          <div className="flex justify-end">
            <Button disabled={status === "saving"} onClick={() => void handleAdvance()} type="button">
              Save & Next →
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </MovingBorderContainer>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <div className="flex gap-2 items-center">
        <Input readOnly value={value} className="flex-1" />
        <CopyButton value={value} label={label} />
      </div>
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

function SaveState({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") return <p className="text-xs text-muted-foreground">Saving...</p>
  if (status === "saved") return <p className="text-xs text-green-600">Saved</p>
  if (status === "error") return <p className="text-xs text-destructive">Save failed</p>
  return <p className="text-xs text-muted-foreground">Auto-saves while you type</p>
}
