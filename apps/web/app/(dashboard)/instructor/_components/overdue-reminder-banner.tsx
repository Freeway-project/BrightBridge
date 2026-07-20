import { AlertTriangle } from "lucide-react"
import type { PendingCourseView } from "@/lib/instructor-reminders/pending"

interface Props {
  /** Overdue-and-never-opened courses (already filtered by the caller). */
  courses: PendingCourseView[]
}

/**
 * Red reminder banner shown at the top of the instructor dashboard when
 * courses sent more than a week ago have never been opened.
 */
export function OverdueReminderBanner({ courses }: Props) {
  if (courses.length === 0) return null

  const count = courses.length
  const one = count === 1

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-800 dark:text-red-400"
    >
      <AlertTriangle className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-base font-bold">
          {one ? "1 overdue course is waiting for you" : `${count} overdue courses are waiting for you`}
        </p>
        <p className="text-sm font-medium opacity-80">
          {one ? "It was" : "They were"} sent over a week ago and you haven&apos;t opened{" "}
          {one ? "it" : "them"} yet — please take a look below.
        </p>
      </div>
    </div>
  )
}
