import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { BucketBadge } from "@/components/admin/handoff/bucket-badge"
import { cn } from "@/lib/utils"
import type { PendingCourseView } from "@/lib/instructor-reminders/pending"

interface Props {
  /** Pending courses, already sorted most pending first. */
  courses: PendingCourseView[]
}

function subtitle(c: PendingCourseView) {
  return [c.department, c.term].filter(Boolean).join(" · ")
}

function waitingLabel(days: number | null) {
  if (days === null || days === 0) return "Sent today"
  return days === 1 ? "Waiting 1 day" : `Waiting ${days} days`
}

function PendingCard({ course }: { course: PendingCourseView }) {
  return (
    <Link
      href={`/instructor/courses/${course.id}`}
      className={cn(
        "group block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40",
        course.bucket === "overdue"
          ? "border-red-500/40 hover:border-red-500/60"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground" title={course.title}>
            {course.title}
          </p>
          {subtitle(course) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle(course)}</p>
          )}
        </div>
        <BucketBadge bucket={course.bucket} days={course.daysSinceSent} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden /> {waitingLabel(course.daysSinceSent)}
          </span>
          {!course.visited && (
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              Not opened yet
            </span>
          )}
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  )
}

/**
 * Top-of-dashboard overview of every course pending the instructor's action,
 * most pending (longest waiting) first.
 */
export function PendingCourseCards({ courses }: Props) {
  if (courses.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          Pending courses
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {courses.length}
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Everything waiting on you, longest-waiting first.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((course) => (
          <PendingCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  )
}
