"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"
import { ReviewTimer } from "./review-timer"

const STEPS = [
  { label: "Metadata", sub: "Course info", href: "metadata" },
  { label: "Review Matrix", sub: "Checklist items", href: "review-matrix" },
  { label: "Syllabus & GB", sub: "Docs review", href: "syllabus-gradebook" },
  { label: "Issue Log", sub: "Track problems", href: "issue-log" },
  { label: "Submit", sub: "Final review", href: "submit" },
] as const

const TIMER_STEPS = new Set(["review-matrix", "syllabus-gradebook"])

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
  const activeHref = STEPS[activeIndex]?.href ?? ""
  const showTimer = activeHref !== "submit"

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar/40 p-5 lg:block">
      <div className="flex flex-col h-full gap-6">
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Active Review
          </p>
          <div className="space-y-1">
            <h2 className="line-clamp-2 text-sm font-bold text-foreground leading-tight">
              {courseTitle}
            </h2>
            <StatusBadge status={courseStatus} className="text-[10px]" />
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {STEPS.map((step, index) => {
            const active = index === activeIndex
            const done = index < activeIndex

            return (
              <Link
                key={step.href}
                href={`/courses/${courseId}/${step.href}`}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <div className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border-2 transition-colors",
                  active
                    ? "bg-primary-foreground text-primary border-primary-foreground"
                    : done 
                      ? "bg-green-500/10 text-green-500 border-green-500/20" 
                      : "bg-muted text-muted-foreground border-border group-hover:border-foreground/20"
                )}>
                  {done ? "✓" : index + 1}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold leading-none">{step.label}</p>
                  <p className={cn(
                    "text-[11px] leading-tight",
                    active ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {step.sub}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>

        {showTimer && (
          <ReviewTimer 
            storageKey={`coursebridge:${courseId}:timer:active`} 
            label="Review Timer"
          />
        )}
      </div>
    </aside>
  )
}
