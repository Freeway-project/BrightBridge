"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
  { label: "Timeline", sub: "Full history", href: "timeline" },
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

// Steps that live as sections in the single-scroll workspace (Timeline is its
// own page). Section ids match the WorkspaceSection ids on the combined page.
const SCROLL_STEPS = new Set(["metadata", "review-matrix", "syllabus-gradebook", "issue-log", "submit"])

export function WorkspaceNav({ courseId, courseTitle, courseStatus, reviewerName, instructorName }: WorkspaceNavProps) {
  const pathname = usePathname()
  // The combined single-scroll workspace lives at the course root; the dedicated
  // step pages add a trailing segment. On the combined page the nav scroll-jumps
  // between sections instead of navigating routes.
  const isCombined = pathname === `/courses/${courseId}` || pathname === `/courses/${courseId}/`
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => pathname.endsWith(`/${step.href}`)),
  )
  const [activeSection, setActiveSection] = useState("metadata")

  useEffect(() => {
    if (!isCombined) return
    const ids = STEPS.filter((s) => SCROLL_STEPS.has(s.href)).map((s) => `section-${s.href}`)
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (top) setActiveSection(top.target.id.replace(/^section-/, ""))
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isCombined, courseId])

  function scrollToSection(href: string) {
    document.getElementById(`section-${href}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(href)
  }

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
              const useScroll = isCombined && SCROLL_STEPS.has(step.href)
              const active = useScroll
                ? activeSection === step.href
                : isCombined
                  ? false
                  : index === activeIndex
              const done = !isCombined && index < activeIndex

              const itemClassName = cn(
                "group relative flex w-full items-start gap-4 rounded-xl px-3 py-3 text-left transition-all duration-300",
                active
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-lg shadow-primary/5"
                  : "text-muted-foreground hover:bg-white/5",
              )

              const inner = (
                <>
                  <motion.div
                    layout
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black border-2 transition-all duration-500",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-110"
                        : done 
                          ? "bg-success text-success-foreground border-success/50" 
                          : "bg-background border-border group-hover:border-primary/50"
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={done ? "done" : "todo"}
                        initial={{ opacity: 0, scale: 0.5, rotate: done ? -20 : 0 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      >
                        {done ? "✓" : index + 1}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
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
                </>
              )

              if (useScroll) {
                return (
                  <button key={step.href} type="button" onClick={() => scrollToSection(step.href)} className={itemClassName}>
                    {inner}
                  </button>
                )
              }

              return (
                <Link key={step.href} href={`/courses/${courseId}/${step.href}`} className={itemClassName}>
                  {inner}
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
