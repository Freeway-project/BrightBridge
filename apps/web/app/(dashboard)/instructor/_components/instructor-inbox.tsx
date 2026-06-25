"use client"

import { useMemo } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCircle2, Clock, GraduationCap, Info } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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

function TabCount({ count, active }: { count: number; active?: boolean }) {
  if (count === 0) return null
  return (
    <span
      className={cn(
        "ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
        active
          ? "bg-primary/20 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  )
}

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

function PassiveRow({ item }: { item: ClassifiedCourse<InboxCourse> }) {
  const { course, actionLabel } = item
  const { relative, absolute } = sentAgo(course.updatedAt)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-muted-foreground" title={course.title}>{course.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
          {actionLabel}{subtitle(course) ? ` · ${subtitle(course)}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground/60" title={absolute}>{relative}</span>
    </div>
  )
}

function LinkedRow({ item }: { item: ClassifiedCourse<InboxCourse> }) {
  const { course, actionLabel } = item
  const { relative, absolute } = sentAgo(course.updatedAt)
  return (
    <Link
      href={`/instructor/courses/${course.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" title={course.title}>{course.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {actionLabel}{subtitle(course) ? ` · ${subtitle(course)}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground" title={absolute}>{relative}</span>
    </Link>
  )
}

function EmptyPanel({ icon, message, hint }: { icon: React.ReactNode; message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function InboxPanel({ courses, emptyHint, actionVerb }: { courses: InboxCourse[]; emptyHint: string; actionVerb: string }) {
  const { needsReview, waiting, approved } = classifyInstructorCourses(courses)

  const defaultTab =
    needsReview.length > 0 ? "review" : waiting.length > 0 ? "waiting" : "approved"

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList variant="line" className="w-full justify-start gap-6 border-b border-border/40 pb-0">
        <TabsTrigger value="review" className="pb-3">
          Needs Review
          <TabCount count={needsReview.length} />
        </TabsTrigger>
        <TabsTrigger value="waiting" className="pb-3">
          Waiting on Team
          <TabCount count={waiting.length} />
        </TabsTrigger>
        <TabsTrigger value="approved" className="pb-3">
          Approved
          <TabCount count={approved.length} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="review" className="space-y-3">
        {needsReview.length > 0 ? (
          needsReview.map((item) => (
            <ActionCard key={item.course.id} item={item} actionVerb={actionVerb} />
          ))
        ) : (
          <EmptyPanel
            icon={<CheckCircle2 className="mb-2 size-7 text-emerald-500" aria-hidden />}
            message="You're all caught up"
            hint={emptyHint}
          />
        )}
      </TabsContent>

      <TabsContent value="waiting" className="space-y-3">
        {waiting.length > 0 ? (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>These courses are being handled by the team — no action needed. You&apos;ll be notified when something requires your attention.</span>
            </div>
            {waiting.map((item) => <PassiveRow key={item.course.id} item={item} />)}
          </>
        ) : (
          <EmptyPanel
            icon={<Clock className="mb-2 size-7 text-muted-foreground" aria-hidden />}
            message="Nothing waiting on the team"
            hint="Courses being handled by the team will appear here."
          />
        )}
      </TabsContent>

      <TabsContent value="approved" className="space-y-3">
        {approved.length > 0 ? (
          approved.map((item) => <LinkedRow key={item.course.id} item={item} />)
        ) : (
          <EmptyPanel
            icon={<GraduationCap className="mb-2 size-7 text-muted-foreground" aria-hidden />}
            message="No approved courses yet"
            hint="Courses you've approved will show up here."
          />
        )}
      </TabsContent>
    </Tabs>
  )
}

export function InstructorInbox({ courses, heading, subheading, emptyHint, actionVerb = "Review & approve" }: Props) {
  const { needsReview } = classifyInstructorCourses(courses)

  const deptTabs = useMemo(() => {
    const hasUnitNames = courses.some((c) => c.orgUnitName)
    if (!hasUnitNames) return null

    const map = new Map<string, InboxCourse[]>()
    for (const c of courses) {
      const key = c.orgUnitName ?? "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [courses])

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
        <Tabs defaultValue={deptTabs[0][0]} className="space-y-6">
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-x-6 gap-y-1 border-b border-border/40 pb-0">
            {deptTabs.map(([name, deptCourses]) => (
              <TabsTrigger key={name} value={name} className="pb-3 text-xs">
                {name}
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground tabular-nums">
                  {deptCourses.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {deptTabs.map(([name, deptCourses]) => (
            <TabsContent key={name} value={name}>
              <InboxPanel courses={deptCourses} emptyHint={emptyHint} actionVerb={actionVerb} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <InboxPanel courses={courses} emptyHint={emptyHint} actionVerb={actionVerb} />
      )}
    </section>
  )
}
