"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Circle, ChevronLeft, User, ShieldCheck, GraduationCap } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"
import { ReviewTimer } from "./review-timer"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

const STEPS = [
  { label: "Metadata", sub: "Course info", href: "metadata" },
  { label: "Review Matrix", sub: "Checklist items", href: "review-matrix" },
  { label: "Syllabus & GB", sub: "Docs review", href: "syllabus-gradebook" },
  { label: "Issues", sub: "Track problems", href: "issue-log" },
  { label: "Submit", sub: "Final review", href: "submit" },
] as const

type WorkspaceNavProps = {
  courseId: string
  courseTitle: string
  courseStatus: CourseStatus
  reviewerName: string
  instructorName: string | null
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 1)
}

export function WorkspaceNav({ courseId, courseTitle, courseStatus, reviewerName, instructorName }: WorkspaceNavProps) {
  const pathname = usePathname()
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => pathname.endsWith(`/${step.href}`)),
  )

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border-icy bg-sidebar/40 p-5 lg:block overflow-y-auto backdrop-blur-sm">
      <div className="flex flex-col h-full gap-6">
        <Link 
          href="/ta" 
          className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-muted-foreground hover:text-primary transition-all group"
        >
          <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
          Dashboard
        </Link>

        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="line-clamp-2 text-sm font-black text-foreground leading-tight tracking-tight">
              {courseTitle}
            </h2>
            <StatusBadge status={courseStatus} className="text-[9px]" />
          </div>
        </div>

        <Separator className="bg-border-icy" />

        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50">
            Navigation
          </p>
          <nav className="relative space-y-1">
            {/* Vertical connector line */}
            <div className="absolute left-6 top-4 bottom-4 w-px bg-primary/10" />
            
            {STEPS.map((step, index) => {
              const active = index === activeIndex
              const done = index < activeIndex

              return (
                <Link
                  key={step.href}
                  href={`/courses/${courseId}/${step.href}`}
                  className={cn(
                    "group relative flex items-start gap-4 rounded-xl px-3 py-3 transition-all duration-300",
                    active
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-lg shadow-primary/5"
                      : "text-muted-foreground hover:bg-white/5",
                  )}
                >
                  <div className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black border-2 transition-all duration-500",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-110"
                      : done 
                        ? "bg-success text-success-foreground border-success/50" 
                        : "bg-background border-border group-hover:border-primary/50"
                  )}>
                    {done ? "✓" : index + 1}
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <p className={cn("text-[11px] font-black uppercase tracking-tight leading-none", active ? "text-primary" : "text-foreground/70 group-hover:text-foreground")}>
                      {step.label}
                    </p>
                    <p className={cn(
                      "text-[9px] font-bold leading-tight uppercase tracking-wider opacity-50",
                      active ? "text-primary/70" : "text-muted-foreground"
                    )}>
                      {step.sub}
                    </p>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        <Separator className="bg-border-icy" />

        {/* Participants Section */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50">
            Participants
          </p>
          <div className="space-y-4 px-1">
            {/* TA */}
            <div className="flex items-center gap-3">
              <Avatar className="size-8 border border-primary/20 bg-primary/5 ring-2 ring-primary/5">
                <AvatarFallback className="text-[10px] font-black text-primary">
                  {getInitials(reviewerName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Dev TA</span>
                <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{reviewerName}</span>
              </div>
            </div>

            {/* Admin */}
            <div className="flex items-center gap-3 opacity-60">
              <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-border bg-muted/20">
                <ShieldCheck className="size-4 text-muted-foreground/40" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Admin</span>
                <span className="text-[10px] font-bold text-muted-foreground italic">Pending assignment</span>
              </div>
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-3">
              {instructorName ? (
                <>
                  <Avatar className="size-8 border border-info/20 bg-info/5">
                    <AvatarFallback className="text-[10px] font-black text-info">
                      {getInitials(instructorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Instructor</span>
                    <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{instructorName}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-border bg-muted/20">
                    <GraduationCap className="size-4 text-muted-foreground/40" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Instructor</span>
                    <span className="text-[10px] font-bold text-muted-foreground italic">Pending selection</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border-icy">
          <ReviewTimer
            storageKey={`coursebridge:${courseId}:timer:overall`}
            label="Review Duration"
          />
        </div>
      </div>
    </aside>
  )
}
