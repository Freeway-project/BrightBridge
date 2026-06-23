"use client"

import { useState } from "react"
import { Building2, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { InstructorInbox } from "./instructor-inbox"

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
  myCourses: InboxCourse[]
  departmentCourses: InboxCourse[]
}

type DashboardTab = "mine" | "department"

export function InstructorDashboardTabs({ myCourses, departmentCourses }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("mine")

  const tabs: Array<{
    key: DashboardTab
    label: string
    description: string
    count: number
    icon: typeof UserRound
    activeClassName: string
  }> = [
    {
      key: "mine",
      label: "Your reviews",
      description: "Courses sent directly to you for approval or follow-up.",
      count: myCourses.length,
      icon: UserRound,
      activeClassName:
        "border-sky-200 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(2,132,199,0.45)]",
    },
    {
      key: "department",
      label: "Department oversight",
      description: "Monitor and act on courses across the departments you oversee.",
      count: departmentCourses.length,
      icon: Building2,
      activeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_10px_30px_-18px_rgba(5,150,105,0.45)]",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-2">
        <div className="grid gap-2 md:grid-cols-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left transition-all duration-200",
                  isActive
                    ? tab.activeClassName
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4" aria-hidden />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </div>
                    <p className="text-sm leading-5 text-current/75">{tab.description}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      isActive ? "bg-amber-400 text-amber-950 shadow-sm" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === "mine" ? (
        <InstructorInbox
          courses={myCourses}
          heading="Needs your review"
          subheading="Courses sent to you — review and approve, or ask the team a question."
          emptyHint="When a course is ready for you, it'll show up here."
          actionVerb="Review & approve"
        />
      ) : (
        <InstructorInbox
          courses={departmentCourses}
          heading="Your department"
          subheading="All courses in your division — act on instructor reviews or track pipeline progress."
          emptyHint="No courses in your department are currently waiting for instructor action."
          actionVerb="Open & act"
        />
      )}
    </div>
  )
}
