"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"
import { ReviewTimer } from "./review-timer"

const STEPS = [
  { label: "Metadata", href: "metadata" },
  { label: "Review Matrix", href: "review-matrix" },
  { label: "Syllabus & Gradebook", href: "syllabus-gradebook" },
  { label: "Issue Log", href: "issue-log" },
  { label: "Submit", href: "submit" },
] as const

type WorkspaceNavProps = {
  courseId: string
  courseTitle: string
  courseStatus: CourseStatus
}

export function WorkspaceNav({ courseId, courseTitle, courseStatus }: WorkspaceNavProps) {
  const pathname = usePathname()
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => pathname.endsWith(`/${step.href}`)),
  )

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar/35 p-4 lg:block">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Course review</p>
          <h2 className="line-clamp-2 text-sm font-semibold text-foreground">{courseTitle}</h2>
          <StatusBadge status={courseStatus} />
        </div>

        <nav className="space-y-1">
          {STEPS.map((step, index) => {
            const active = index === activeIndex
            const done = index < activeIndex

            return (
              <Link
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                href={`/courses/${courseId}/${step.href}`}
                key={step.href}
              >
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <Circle className="size-4 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </Link>
            )
          })}
        </nav>

        <ReviewTimer storageKey={`coursebridge:${courseId}:review-timer`} />
      </div>
    </aside>
  )
}
