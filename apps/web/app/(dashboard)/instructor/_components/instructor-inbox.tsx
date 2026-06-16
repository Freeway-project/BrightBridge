"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCircle2, ChevronDown, Clock, GraduationCap, Info } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { classifyInstructorCourses, type ClassifiedCourse } from "./classify-courses"

type InboxCourse = {
  id: string
  title: string
  term: string | null
  department: string | null
  orgUnitName?: string | null
  status: import("@coursebridge/workflow").CourseStatus
  updatedAt: string
}

interface Props {
  courses: InboxCourse[]
  heading: string
  subheading: string
  emptyHint: string
  actionVerb?: string
}

function subtitle(c: InboxCourse) {
  return [c.department, c.term].filter(Boolean).join(" · ")
}

function sentAgo(updatedAt: string) {
  const d = new Date(updatedAt)
  return {
    relative: formatDistanceToNow(d, { addSuffix: true }),
    absolute: d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  }
}

/** Big action card for a course that needs the instructor now. */
function ActionCard({ item, actionVerb }: { item: ClassifiedCourse<InboxCourse>; actionVerb: string }) {
  const { course, actionLabel } = item
  const { relative, absolute } = sentAgo(course.updatedAt)
  return (
    <Link
      href={`/instructor/courses/${course.id}`}
      className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground" title={course.title}>{course.title}</p>
          {subtitle(course) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle(course)}</p>
          )}
        </div>
        <StatusBadge status={course.status} className="shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{actionLabel}</span>
          <span className="inline-flex items-center gap-1.5" title={absolute}>
            <Clock className="size-3.5" aria-hidden /> {relative}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
          {actionVerb} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

/** Compact collapsible group for passive courses (waiting / approved). */
function CourseGroup({
  title,
  items,
  icon,
  defaultOpen = false,
  passive = false,
}: {
  title: string
  items: ClassifiedCourse<InboxCourse>[]
  icon: React.ReactNode
  defaultOpen?: boolean
  /** When true, items are informational only — no navigation link or hover state. */
  passive?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-left hover:bg-muted/60">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {passive && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              These courses are currently being handled by the team — no action needed from you. You&apos;ll be notified when something requires your attention.
            </span>
          </div>
        )}
        {items.map(({ course, actionLabel }) => {
          const { relative, absolute } = sentAgo(course.updatedAt)
          if (passive) {
            return (
              <div
                key={course.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-muted-foreground" title={course.title}>{course.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                    {actionLabel}
                    {subtitle(course) ? ` · ${subtitle(course)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground/60" title={absolute}>
                  {relative}
                </span>
              </div>
            )
          }
          return (
            <Link
              key={course.id}
              href={`/instructor/courses/${course.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground" title={course.title}>{course.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {actionLabel}
                  {subtitle(course) ? ` · ${subtitle(course)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground" title={absolute}>
                {relative}
              </span>
            </Link>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The core inbox panel — action cards + passive groups. */
function InboxPanel({
  courses,
  emptyHint,
  actionVerb,
}: {
  courses: InboxCourse[]
  emptyHint: string
  actionVerb: string
}) {
  const { needsReview, waiting, approved } = classifyInstructorCourses(courses)
  const nothingAtAll = courses.length === 0

  return (
    <div className="space-y-6">
      {needsReview.length > 0 ? (
        <div className="grid gap-3">
          {needsReview.map((item) => (
            <ActionCard key={item.course.id} item={item} actionVerb={actionVerb} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center">
          {nothingAtAll ? (
            <GraduationCap className="mb-2 size-7 text-muted-foreground" aria-hidden />
          ) : (
            <CheckCircle2 className="mb-2 size-7 text-emerald-500" aria-hidden />
          )}
          <p className="text-sm font-medium text-foreground">
            {nothingAtAll ? "Nothing here yet" : "You're all caught up"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
        </div>
      )}

      {(waiting.length > 0 || approved.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Other courses</span>
            <div className="flex-1 border-t border-border/40" />
          </div>
          <CourseGroup
            title="Waiting on the team"
            items={waiting}
            icon={<Clock className="size-4 text-muted-foreground" aria-hidden />}
            defaultOpen={waiting.length > 0 && needsReview.length === 0}
            passive
          />
          <CourseGroup
            title="Approved"
            items={approved}
            icon={<CheckCircle2 className="size-4 text-emerald-500" aria-hidden />}
          />
        </div>
      )}
    </div>
  )
}

export function InstructorInbox({ courses, heading, subheading, emptyHint, actionVerb = "Review & approve" }: Props) {
  const { needsReview } = classifyInstructorCourses(courses)

  // Build dept tabs only when courses carry orgUnitName (dept view).
  const deptTabs = useMemo(() => {
    const hasUnitNames = courses.some((c) => c.orgUnitName)
    if (!hasUnitNames) return null

    const map = new Map<string, InboxCourse[]>()
    for (const c of courses) {
      const key = c.orgUnitName ?? "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    // Sort tabs: most courses first
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [courses])

  const [activeTab, setActiveTab] = useState<string | null>(null)
  const effectiveTab = activeTab ?? deptTabs?.[0]?.[0] ?? null

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {heading}
          {needsReview.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {needsReview.length}
            </span>
          )}
          {deptTabs && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {courses.length} total
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      {deptTabs ? (
        <div className="space-y-4">
          {/* Department tab strip */}
          <div className="flex flex-wrap gap-2">
            {deptTabs.map(([name, deptCourses]) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTab(name)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                  effectiveTab === name
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {name}
                <span className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  effectiveTab === name ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {deptCourses.length}
                </span>
              </button>
            ))}
          </div>

          {/* Active dept panel */}
          {effectiveTab && (
            <InboxPanel
              courses={deptTabs.find(([name]) => name === effectiveTab)?.[1] ?? []}
              emptyHint={emptyHint}
              actionVerb={actionVerb}
            />
          )}
        </div>
      ) : (
        <InboxPanel courses={courses} emptyHint={emptyHint} actionVerb={actionVerb} />
      )}
    </section>
  )
}
