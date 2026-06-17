"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Network,
  Building2,
  Bell,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { cn } from "@/lib/utils"

interface Props {
  role: string
}

export function ProvostOnboardingTour({ role }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [visitCount, setVisitCount] = useState(0)
  const [isPlayful, setIsPlayful] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    if (role !== "provost") return

    // Track sessions
    const sessionCounted = sessionStorage.getItem("cb_provost_session_counted")
    let count = parseInt(localStorage.getItem("cb_provost_onboarding_count") || "0", 10)

    if (!sessionCounted) {
      count += 1
      localStorage.setItem("cb_provost_onboarding_count", count.toString())
      sessionStorage.setItem("cb_provost_session_counted", "true")
    }

    setVisitCount(count)
    setIsPlayful(count <= 3)

    // Auto-open modal for the first 3 logins
    if (count <= 3) {
      setIsOpen(true)
    }
  }, [role])

  if (role !== "provost") return null

  const tabsInfo = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      emoji: "📊",
      subtitle: "Institution Command Center",
      meaning: "The central hub for high-level monitoring.",
      does: [
        "Displays aggregated KPIs (Total Courses, Completed, In Progress, Stuck/At-Risk).",
        "Tracks stuck/at-risk courses that require immediate executive attention.",
        "Visualizes the phase breakdown of all active courses across the workflow.",
        "Provides a real-time 'Activity Feed' of who did what across the entire platform.",
      ],
      color: "from-blue-500 to-indigo-500",
      glowColor: "rgba(59, 130, 246, 0.15)",
    },
    {
      id: "hierarchy",
      label: "Hierarchy",
      icon: Network,
      emoji: "🌳",
      subtitle: "Institution-wide Explorer",
      meaning: "A structural drill-down system to inspect any unit or subunit.",
      does: [
        "Provides an interactive tree map of colleges, schools, and departments.",
        "Filters metrics (Courses, In Progress, Approved, Needs Attention) for the selected unit.",
        "Displays unit leadership assignments (Deans, Department Heads, and Admins).",
        "Includes a searchable, filterable table of every course within the selected unit's subtree.",
      ],
      color: "from-purple-500 to-pink-500",
      glowColor: "rgba(168, 85, 247, 0.15)",
    },
    {
      id: "organization",
      label: "Organization",
      icon: Building2,
      emoji: "🏢",
      subtitle: "Structure & Leadership Architect",
      meaning: "The management panel to build and align the organization.",
      does: [
        "Allows creating new organizational units (Colleges, Faculties, Schools, Departments).",
        "Gives you capabilities to assign and manage leadership roles (Deans & Department Heads).",
        "Provides editing features to restructure relationships between parent and child units.",
      ],
      color: "from-emerald-500 to-teal-500",
      glowColor: "rgba(16, 185, 129, 0.15)",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      emoji: "🔔",
      subtitle: "Real-time Action Inbox",
      meaning: "Your personal center for workflow action items.",
      does: [
        "Alerts you immediately when courses enter stages requiring approval or attention.",
        "Logs changes, questions from instructors, and administrator requests.",
        "Allows jumping directly to any relevant course review page to resolve issues.",
      ],
      color: "from-amber-500 to-orange-500",
      glowColor: "rgba(245, 158, 11, 0.15)",
    },
    {
      id: "guide",
      label: "Workflow Guide",
      icon: HelpCircle,
      emoji: "📖",
      subtitle: "Reference Handbook",
      meaning: "A documentation space to align on platform guidelines.",
      does: [
        "Explains the exact course review stages from migration to final approval.",
        "Clarifies the roles and permissions of deans, instructors, TAs, and admins.",
        "Serves as a dictionary for all status tags and review rules.",
      ],
      color: "from-cyan-500 to-blue-500",
      glowColor: "rgba(6, 182, 212, 0.15)",
    },
  ]

  const currentTab = tabsInfo.find((t) => t.id === activeTab) || tabsInfo[0]

  return (
    <>
      {/* Floating help trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-4 py-2.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-muted hover:scale-105 active:scale-95 duration-200"
        aria-label="Open Provost Guide"
      >
        <Sparkles className="size-3.5 text-primary animate-pulse" />
        <span>Provost Guide</span>
        {visitCount <= 3 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className={cn(
            "max-w-4xl p-0 overflow-hidden border transition-all duration-500 ease-in-out rounded-2xl",
            isPlayful
              ? "bg-slate-950/95 border-purple-500/30 text-white shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)]"
              : "bg-background border-border text-foreground shadow-2xl"
          )}
          showCloseButton={true}
        >
          {isPlayful && <BackgroundBeams className="opacity-40" />}

          {/* Modal Header */}
          <div className="relative z-10 px-6 pt-6 pb-4 border-b border-border/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={isPlayful ? "secondary" : "outline"}
                  className={cn(
                    "font-bold uppercase tracking-widest text-[9px] px-2 py-0.5",
                    isPlayful
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse"
                      : "text-muted-foreground"
                  )}
                >
                  {isPlayful ? "✨ Onboarding Tour" : "👔 Corporate Guide"}
                </Badge>
                <span className="text-[11px] text-muted-foreground/80">
                  Login Session: <span className="font-bold text-foreground">{visitCount}</span>/3
                </span>
              </div>
              <DialogTitle className={cn(
                "text-2xl font-black tracking-tight",
                isPlayful && "bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-teal-400"
              )}>
                Executive Provost Guide
              </DialogTitle>
              <DialogDescription className={isPlayful ? "text-slate-400" : "text-muted-foreground"}>
                Get oriented with the core workspaces designed for institution-wide oversight.
              </DialogDescription>
            </div>

            {/* Aesthetic Mode Switcher */}
            <div className={cn(
              "flex items-center gap-1.5 p-1 rounded-xl w-fit shrink-0",
              isPlayful ? "bg-white/5 border border-white/5" : "bg-muted"
            )}>
              <button
                onClick={() => setIsPlayful(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  isPlayful
                    ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30 shadow-inner"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3" />
                Vibrant
              </button>
              <button
                onClick={() => setIsPlayful(false)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  !isPlayful
                    ? "bg-background text-foreground shadow border border-border"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Layers className="size-3" />
                Sleek
              </button>
            </div>
          </div>

          {/* Modal Content - Dual Columns */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[240px,1fr] min-h-[400px]">
            {/* Sidebar Navigation */}
            <div className={cn(
              "p-4 border-r md:h-[420px] flex flex-col justify-between",
              isPlayful ? "bg-slate-900/50 border-purple-500/10" : "bg-muted/30 border-border"
            )}>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 mb-2">
                  System Tabs
                </p>
                <div className="space-y-1">
                  {tabsInfo.map((tab) => {
                    const Icon = tab.icon
                    const isSelected = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all group",
                          isSelected
                            ? isPlayful
                              ? "bg-white/10 text-white border border-white/10 font-bold"
                              : "bg-primary/15 text-primary font-bold"
                            : isPlayful
                              ? "text-slate-400 hover:bg-white/5 hover:text-white"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className={cn(
                          "rounded-lg p-1.5 shrink-0 transition-transform group-hover:scale-110",
                          isSelected
                            ? isPlayful
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-primary/10 text-primary"
                            : isPlayful
                              ? "bg-white/5 text-slate-400"
                              : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="size-3.5" />
                        </span>
                        <div className="truncate">
                          <span className="block truncate font-bold">{tab.label}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Counter status label */}
              <div className={cn(
                "rounded-xl p-3 text-xs mt-4",
                isPlayful
                  ? "bg-purple-950/20 border border-purple-500/10 text-purple-300"
                  : "bg-muted/50 border border-border text-muted-foreground"
              )}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Info className="size-3 shrink-0" />
                  <span>Auto-Show Active</span>
                </div>
                <span>
                  This guide auto-displays on your first 3 logins to help you get started.
                </span>
              </div>
            </div>

            {/* Detail Tab Content Workspace */}
            <div className="p-6 md:p-8 flex flex-col justify-between md:h-[420px] overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <span className={cn(
                    "text-4xl shrink-0 p-3 rounded-2xl flex items-center justify-center shadow-inner",
                    isPlayful
                      ? "bg-gradient-to-br bg-slate-900 border border-white/5"
                      : "bg-muted border border-border"
                  )}>
                    {currentTab.emoji}
                  </span>
                  <div className="space-y-1">
                    <h3 className={cn(
                      "text-xl font-extrabold tracking-tight",
                      isPlayful
                        ? `bg-clip-text text-transparent bg-gradient-to-r ${currentTab.color}`
                        : "text-foreground"
                    )}>
                      {currentTab.label} Tab
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {currentTab.subtitle}
                    </p>
                  </div>
                </div>

                {/* Section Details */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
                      What it means
                    </p>
                    <p className={cn("text-sm", isPlayful ? "text-slate-300" : "text-foreground/90")}>
                      {currentTab.meaning}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
                      What you can do
                    </p>
                    <ul className="space-y-2">
                      {currentTab.does.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span className={isPlayful ? "text-slate-300" : "text-muted-foreground"}>
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Next Page / Close Footer */}
              <div className="flex items-center justify-between gap-4 border-t border-border/10 pt-4 mt-6">
                <div className="text-[10px] text-muted-foreground">
                  Press guide button anytime in the bottom right to reopen.
                </div>
                <div className="flex items-center gap-2">
                  {activeTab !== "guide" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const idx = tabsInfo.findIndex((t) => t.id === activeTab)
                        if (idx !== -1 && idx < tabsInfo.length - 1) {
                          setActiveTab(tabsInfo[idx + 1].id)
                        }
                      }}
                      className={cn(
                        "text-xs font-bold",
                        isPlayful ? "hover:bg-white/5 hover:text-white" : ""
                      )}
                    >
                      Next Tab
                      <ArrowRight className="size-3 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "text-xs font-extrabold",
                        isPlayful
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg border border-purple-400/20"
                          : ""
                      )}
                    >
                      Got it 🎉
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
