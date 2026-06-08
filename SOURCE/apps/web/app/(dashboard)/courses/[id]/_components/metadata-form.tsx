"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { CourseRow } from "@/lib/services/courses"
import { saveDraft } from "@/lib/workspace/actions"
import { metadataSchema, type MetadataFormValues } from "@/lib/workspace/schemas"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react"

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
  const dirtySource = `metadata-form:${course.id}`
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
    setUnsavedChanges(dirtySource, form.formState.isDirty)
    return () => clearUnsavedChanges(dirtySource)
  }, [dirtySource, form.formState.isDirty])

  useEffect(() => {
    const stored = localStorage.getItem(`coursebridge:${course.id}:local-draft:course_metadata`)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Partial<MetadataFormValues>
      form.reset({ ...defaultValues, ...parsed }, { keepDefaultValues: false })
      if (parsed.term) {
        const { season, year } = parseTerm(parsed.term)
        setTermSeason(season)
        setTermYear(year)
      }
      setUnsavedChanges(dirtySource, true)
    } catch {
      localStorage.removeItem(`coursebridge:${course.id}:local-draft:course_metadata`)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const sub = form.watch((values) => {
      localStorage.setItem(
        `coursebridge:${course.id}:local-draft:course_metadata`,
        JSON.stringify(values),
      )
    })
    return () => sub.unsubscribe()
  }, [form, course.id])

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
      window.dispatchEvent(new CustomEvent("coursebridge:form-saved"))
      form.reset(form.getValues())
      return true
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      return false
    }
  }

  async function handleAdvance() {
    const ok = await performSave()
    if (ok) router.push(`/courses/${course.id}/review-matrix`)
  }

  const sectionNumbers = useWatch({ control: form.control, name: "section_numbers" })
  const sectionText = sectionNumbers.join(", ")
  const brightspaceUrl = useWatch({ control: form.control, name: "brightspace_url" })
  const moodleUrl = useWatch({ control: form.control, name: "moodle_url" })

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Course Metadata</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Review and confirm course details before proceeding</p>
        </div>
        <SaveBadge status={status} />
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* ── Course Information ────────────────────────── */}
      <Section label="Course Information">
        <InfoRow label="Course ID" value={course.id} copyable />
        <InfoRow label="Course Title" value={course.title} copyable />
        <InfoRow label="Reviewer" value={reviewerName} />
        <InfoRow label="Review Date" value={new Date().toLocaleDateString("en-US")} />
      </Section>

      {/* ── Term & Sections ───────────────────────────── */}
      <Section label="Term">
        <FieldRow label="Season & Year">
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
                  <SelectTrigger className="w-[140px] h-11 rounded-xl border-border bg-background/60 hover:bg-background/80 transition-all text-sm">
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
              <SelectTrigger className="w-[110px] h-11 rounded-xl border-border bg-background/60 hover:bg-background/80 transition-all text-sm">
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
        </FieldRow>
        <FieldRow label="Section Numbers">
          <CleanInput
            onChange={(e) =>
              form.setValue(
                "section_numbers",
                e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                { shouldDirty: true, shouldValidate: true },
              )
            }
            placeholder="001, 002, 003"
            value={sectionText}
          />
        </FieldRow>
      </Section>

      {/* ── Links ─────────────────────────────────────── */}
      <Section label="Links">
        <FieldRow label="Brightspace URL">
          <div className="flex items-center gap-2">
            <CleanInput
              placeholder="https://..."
              className="flex-1"
              {...form.register("brightspace_url")}
            />
            {brightspaceUrl?.trim() && <CopyButton value={brightspaceUrl} label="Brightspace URL" />}
          </div>
          <FieldError message={form.formState.errors.brightspace_url?.message} />
        </FieldRow>
        <FieldRow label="Moodle URL">
          <div className="flex items-center gap-2">
            <CleanInput
              placeholder="https://..."
              className="flex-1"
              {...form.register("moodle_url")}
            />
            {moodleUrl?.trim() && <CopyButton value={moodleUrl} label="Moodle URL" />}
          </div>
          <FieldError message={form.formState.errors.moodle_url?.message} />
        </FieldRow>
      </Section>

      {/* ── Notes ─────────────────────────────────────── */}
      <Section label="Notes">
        <div className="px-5 py-5">
          <Textarea
            rows={5}
            placeholder="Add any migration notes, observations, or context here…"
            className="resize-none rounded-xl border-border bg-background/60 hover:bg-background/80 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10 text-sm transition-all duration-200"
            {...form.register("migration_notes")}
          />
          <FieldError message={form.formState.errors.migration_notes?.message} />
        </div>
      </Section>

      {/* ── Action ────────────────────────────────────── */}
      <div className="flex justify-end pt-1">
        <Button
          disabled={status === "saving"}
          onClick={() => void handleAdvance()}
          type="button"
          className="h-11 rounded-xl px-6 text-sm font-bold uppercase tracking-wider border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 shadow-xl hover:border-white/30 text-white flex items-center gap-2 transition-all duration-300"
        >
          {status === "saving" ? (
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

// ── Small Primitives ──────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="relative space-y-2 group/sec">
      <div className="absolute left-[1px] top-6 bottom-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 group-hover/sec:opacity-100 group-hover/sec:w-[4px] transition-all duration-300" />
      <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
        {label}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl shadow-lg divide-y divide-border/40 pl-[3px]">
        {children}
      </div>
    </section>
  )
}

function InfoRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center gap-6 px-6 py-4">
      <span className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="flex-1 truncate text-sm font-medium text-foreground">{value}</span>
      {copyable && <CopyButton value={value} label={label} />}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6 px-6 py-5">
      <span className="w-36 shrink-0 pt-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex-1 space-y-1.5">{children}</div>
    </div>
  )
}

function CleanInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-11 rounded-xl border border-border bg-background/60 hover:bg-background/80 px-4 text-sm text-foreground placeholder:text-muted-foreground/50",
        "outline-none transition-all duration-200",
        "focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        props.className,
      )}
    />
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving")
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
      Auto-saves
    </span>
  )
}
