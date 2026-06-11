"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCircle2, ChevronDown, Clock, GraduationCap } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { classifyInstructorCourses, type ClassifiedCourse } from "./classify-courses"

type InboxCourse = {
  id: string
  title: string
  term: string | null
  department: string | null
  status: import("@coursebridge/workflow").CourseStatus
  updatedAt: string
}

interface Props {
  courses: InboxCourse[]
  /** Heading for the "needs review" hero. */
  heading: string
  /** Sub-label under the heading. */
  subheading: string
  /** Shown when there is nothing in any bucket. */
  emptyHint: string
  /** Verb on the primary action button (e.g. "Review & approve"). */
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
          <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
          {subtitle(course) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle(course)}</p>
          )}
        </div>
        <StatusBadge status={course.status} className="shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{actionLabel}</span>
          <span className="inline-flex items-center gap-1" title={absolute}>
            <Clock className="size-3" aria-hidden /> {relative}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5">
          {actionVerb} <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

/** Compact, collapsible group for non-actionable courses (waiting / approved). */
function CourseGroup({
  title,
  items,
  icon,
  defaultOpen = false,
}: {
  title: string
  items: ClassifiedCourse<InboxCourse>[]
  icon: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2.5 text-left hover:bg-accent/40">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {items.map(({ course, actionLabel }) => {
          const { relative, absolute } = sentAgo(course.updatedAt)
          return (
            <Link
              key={course.id}
              href={`/instructor/courses/${course.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
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

export function InstructorInbox({ courses, heading, subheading, emptyHint, actionVerb = "Review & approve" }: Props) {
  const { needsReview, waiting, approved } = classifyInstructorCourses(courses)
  const nothingAtAll = courses.length === 0

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {heading}
          {needsReview.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {needsReview.length}
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      {needsReview.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="space-y-2">
        <CourseGroup
          title="Waiting on the team"
          items={waiting}
          icon={<Clock className="size-4 text-muted-foreground" aria-hidden />}
        />
        <CourseGroup
          title="Approved"
          items={approved}
          icon={<CheckCircle2 className="size-4 text-emerald-500" aria-hidden />}
        />
      </div>
    </section>
  )
}
