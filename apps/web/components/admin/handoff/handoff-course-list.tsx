"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/courses/status-badge"
import { OpenedDot } from "@/components/instructor/opened-dot"
import { cn } from "@/lib/utils"
import type { HandoffBucket } from "@/lib/admin/handoff-buckets"
import type { HandoffCourseView } from "@/lib/admin/queries"
import { BUCKET_META, BUCKET_ORDER, BucketBadge } from "./bucket-badge"

interface Props {
  courses: HandoffCourseView[]
}

type BucketFilter = HandoffBucket | "all"

export function HandoffCourseList({ courses }: Props) {
  const [bucket, setBucket] = useState<BucketFilter>("all")
  const [instructor, setInstructor] = useState<string>("all")

  const bucketCounts = useMemo(() => {
    const counts: Record<HandoffBucket, number> = { overdue: 0, aging: 0, fresh: 0 }
    for (const c of courses) counts[c.bucket] += 1
    return counts
  }, [courses])

  const instructors = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of courses) {
      if (!c.instructorEmail) continue
      map.set(c.instructorEmail, c.instructorName || c.instructorEmail)
    }
    return Array.from(map, ([email, name]) => ({ email, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [courses])

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (bucket !== "all" && c.bucket !== bucket) return false
      if (instructor !== "all" && c.instructorEmail !== instructor) return false
      return true
    })
  }, [courses, bucket, instructor])

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="gap-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            <Clock className="size-3.5 text-muted-foreground/70" />
            Courses In Instructor Hands
            <span className="ml-1 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
              {filtered.length} of {courses.length}
            </span>
          </CardTitle>
          {instructors.length > 0 ? (
            <select
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-primary/40"
              aria-label="Filter by instructor"
            >
              <option value="all">All instructors</option>
              {instructors.map((i) => (
                <option key={i.email} value={i.email}>
                  {i.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={bucket === "all"} onClick={() => setBucket("all")}>
            All ({courses.length})
          </FilterChip>
          {BUCKET_ORDER.map((b) => (
            <FilterChip
              key={b}
              active={bucket === b}
              activeClass={BUCKET_META[b].chip}
              onClick={() => setBucket(b)}
            >
              {BUCKET_META[b].label} ({bucketCounts[b]})
            </FilterChip>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {courses.length === 0 ? "Nothing waiting on instructors" : "No matching courses"}
            </p>
            <p className="text-xs text-muted-foreground">
              {courses.length === 0
                ? "Every sent course has been approved"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{course.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusBadge status={course.status} className="h-4 text-[9px]" />
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <OpenedDot openedAt={course.firstOpenedAt} size="sm" />
                        {course.opened
                          ? `Opened${course.openCount > 1 ? ` · ${course.openCount}×` : ""}`
                          : "Not opened"}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {course.instructorName || course.instructorEmail || "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <BucketBadge
                    bucket={course.bucket}
                    days={course.daysSinceSent}
                    className="gap-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function FilterChip({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean
  activeClass?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
        active
          ? activeClass ?? "bg-primary/15 text-primary"
          : "bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
