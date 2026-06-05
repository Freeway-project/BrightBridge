"use client"

import { useState, useMemo } from "react"
import { CourseCard } from "./course-card"
import type { CourseSummary } from "@/lib/courses/service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { Search as SearchIcon, AlertCircle, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { WORKFLOW_PHASES, getPipelineStage, type PipelineStage } from "@coursebridge/workflow"
import type { StatCardIcon } from "@/components/shared/stat-card"

// Top-level phase tabs reuse the workflow phases, plus a cross-cutting "Issues" tab.
const PHASE_STYLE: Record<PipelineStage, { emoji: string; activeColor: string }> = {
  migration: { emoji: "🧭", activeColor: "text-blue-500 after:bg-blue-500" },
  staging: { emoji: "🛠️", activeColor: "text-orange-500 after:bg-orange-500" },
  instructor: { emoji: "🎓", activeColor: "text-violet-500 after:bg-violet-500" },
  provision: { emoji: "✅", activeColor: "text-emerald-500 after:bg-emerald-500" },
}

export interface CourseStat {
  label: string
  value: number | string
  icon?: StatCardIcon
}

export type IssueCountMap = Record<string, { open: number; resolved: number }>

interface CourseListViewProps {
  initialCourses: CourseSummary[]
  stats?: CourseStat[]
  issueCounts?: IssueCountMap
  /** Show Excel/PDF export buttons on cards — admin/super_admin only (export routes are gated). */
  canExport?: boolean
  /** Whether the list should scroll internally. Defaults to true. */
  scrollable?: boolean
}

const SUBJECT_PATTERN = /^([A-Za-z]+)/

function getCourseSubject(course: CourseSummary): string | null {
  const match = course.sourceCourseId?.trim().match(SUBJECT_PATTERN)
  return match?.[1]?.toUpperCase() ?? null
}

export function CourseListView({ initialCourses, issueCounts = {}, canExport = false, scrollable = true }: CourseListViewProps) {
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("all")
  const [term, setTerm] = useState("all")
  const [issueSort, setIssueSort] = useState<"latest" | "replies" | "open">("open")

  const subjects = useMemo(() => {
    const set = new Set(initialCourses.map(getCourseSubject).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [initialCourses])

  const terms = useMemo(() => {
    const set = new Set(initialCourses.map((c) => c.term).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [initialCourses])

  const filtered = useMemo(() => {
    return initialCourses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.sourceCourseId?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesSubject = subject === "all" || getCourseSubject(c) === subject
      const matchesTerm = term === "all" || c.term === term
      return matchesSearch && matchesSubject && matchesTerm
    })
  }, [initialCourses, search, subject, term])

  // Group courses by workflow phase → sub-group, from the shared WORKFLOW_PHASES
  // source of truth. Each phase carries its sub-groups (each with its courses)
  // and a total count.
  const phases = useMemo(() =>
    WORKFLOW_PHASES.map((phase) => {
      const groups = phase.groups.map((group) => ({
        ...group,
        courses: filtered.filter((c) => group.statuses.includes(c.status)),
      }))
      return { ...phase, groups, count: groups.reduce((n, g) => n + g.courses.length, 0) }
    })
  , [filtered])

  const issueCourses = useMemo(
    () => filtered.filter((c) => (issueCounts[c.id]?.open ?? 0) > 0),
    [filtered, issueCounts],
  )

  // Default to the first phase that actually has courses (preserve "jump to the
  // most relevant tab" behaviour), else the first phase.
  const defaultTab = (phases.find((p) => p.count > 0) ?? phases[0]).key
  const [activePhase, setActivePhase] = useStickyTabState("course-list-phase", defaultTab)

  return (
    <div className={cn("space-y-6 bg-background", scrollable ? "min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 scrollbar-thin" : "p-0")}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-3 backdrop-blur-md sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="border-none bg-transparent pl-9 shadow-none focus-visible:ring-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="h-8 w-px bg-border/40 hidden sm:block" />
          <Filter className="size-4 text-muted-foreground hidden sm:block" />
          {subjects.length > 0 && (
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-9 w-full border-none bg-transparent shadow-none focus:ring-0 sm:w-[150px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {terms.length > 0 && (
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="h-9 w-full border-none bg-transparent shadow-none focus:ring-0 sm:w-[150px]">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </motion.div>

      {/* Phase tabs (Migration · Staging · Provision) + cross-cutting Issues */}
      <Tabs value={activePhase} onValueChange={setActivePhase} className="w-full">
        <TabsList className="relative flex h-10 w-full items-center justify-start gap-6 border-b border-border/40 bg-transparent p-0 rounded-none">
          {phases.map((phase) => (
            <TabItem
              key={phase.key}
              value={phase.key}
              count={phase.count}
              label={phase.label}
              activeColor={PHASE_STYLE[phase.key].activeColor}
              emoji={PHASE_STYLE[phase.key].emoji}
            />
          ))}
          <TabItem
            value="issues"
            count={issueCourses.length}
            label="Issues"
            activeColor="text-destructive after:bg-destructive"
            emoji="🔴"
          />
        </TabsList>

        <AnimatePresence mode="wait">
          {phases.map((phase) => {
            const onClear = () => { setSearch(""); setSubject("all"); setTerm("all") }
            // Single-group phases (Provision) render the grid directly — no sub-tab row.
            if (phase.groups.length === 1) {
              return (
                <TabsContent key={phase.key} value={phase.key} className="mt-6 focus-visible:outline-none">
                  <CourseGrid
                    courses={phase.groups[0].courses}
                    issueCounts={issueCounts}
                    canExport={canExport}
                    onClear={onClear}
                  />
                </TabsContent>
              )
            }
            const defaultGroup = (phase.groups.find((g) => g.courses.length > 0) ?? phase.groups[0]).key
            return (
              <TabsContent key={phase.key} value={phase.key} className="mt-6 focus-visible:outline-none">
                <Tabs defaultValue={defaultGroup} className="w-full">

                  <TabsList className="flex-wrap gap-2 h-auto bg-transparent p-0">
                    {phase.groups.map((group) => (
                      <TabsTrigger 
                        key={group.key} 
                        value={group.key} 
                        className={cn(
                          "group gap-2 px-4 py-2 rounded-full border shadow-sm transition-all",
                          "border-border/40 bg-background hover:bg-muted/50 hover:border-border/80",
                          "data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_var(--color-primary)]"
                        )}
                      >
                        <span className="font-semibold">{group.label}</span>
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold transition-colors",
                          "bg-muted text-muted-foreground",
                          "group-data-[state=active]:bg-primary/20 group-data-[state=active]:text-primary"
                        )}>
                          {group.courses.length}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {phase.groups.map((group) => (
                    <TabsContent key={group.key} value={group.key} className="mt-6 focus-visible:outline-none">
                      <CourseGrid
                        courses={group.courses}
                        issueCounts={issueCounts}
                        canExport={canExport}
                        onClear={onClear}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            )
          })}

          <TabsContent value="issues" className="mt-6 focus-visible:outline-none">
            <div className="space-y-4">
              {issueCourses.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Sort by:</span>
                  <Select value={issueSort} onValueChange={(v) => setIssueSort(v as any)}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open Issues</SelectItem>
                      <SelectItem value="latest">Latest Activity</SelectItem>
                      <SelectItem value="replies">Most Replies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <CourseGrid
                courses={issueCourses}
                issueCounts={issueCounts}
                canExport={canExport}
                onClear={() => { setSearch(""); setSubject("all"); setTerm("all") }}
                sortBy={issueSort}
              />
            </div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

function TabItem({
  value,
  label,
  count,
  activeColor,
  emoji,
}: {
  value: string
  label: string
  count: number
  activeColor: string
  emoji: string
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "group relative flex h-full items-center gap-2 px-1 pb-3 text-[13px] font-bold uppercase tracking-wider transition-all duration-300",
        "text-muted-foreground/60 hover:text-foreground",
        "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-1 data-[state=active]:after:w-full data-[state=active]:after:shadow-[0_-2px_8px_rgba(0,0,0,0.15)]",
        `data-[state=active]:${activeColor}`,
      )}
    >
      <span className="text-sm grayscale-[0.8] group-data-[state=active]:grayscale-0 transition-all opacity-70 group-data-[state=active]:opacity-100">{emoji}</span>
      {label}
      <span className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground/10 px-1.5 text-[10px] font-black text-muted-foreground transition-colors",
        "group-data-[state=active]:bg-current/10 group-data-[state=active]:text-current"
      )}>
        {count}
      </span>
    </TabsTrigger>
  )
}

function CourseGrid({
  courses,
  issueCounts,
  onClear,
  sortBy = "latest",
  canExport = false,
}: {
  courses: CourseSummary[]
  issueCounts: IssueCountMap
  onClear: () => void
  sortBy?: "latest" | "replies" | "open"
  canExport?: boolean
}) {
  const sortedCourses = useMemo(() => {
    const arr = [...courses]
    if (sortBy === "replies") {
      return arr.sort((a, b) => (issueCounts[b.id]?.resolved ?? 0) - (issueCounts[a.id]?.resolved ?? 0))
    }
    if (sortBy === "open") {
      return arr.sort((a, b) => (issueCounts[b.id]?.open ?? 0) - (issueCounts[a.id]?.open ?? 0))
    }
    return arr
  }, [courses, sortBy, issueCounts])

  if (courses.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/5 p-12 text-center"
      >
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/20">
          <AlertCircle className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-base font-bold text-foreground">No courses found</p>
        <p className="mt-1 text-sm text-muted-foreground">Adjust your filters or try a different search term.</p>
        <Button variant="outline" size="sm" onClick={onClear} className="mt-6 border-border/60">
          Clear filters
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {sortedCourses.map((course, i) => (
        <CourseCard key={course.id} course={course} issueCounts={issueCounts[course.id]} index={i} canExport={canExport} />
      ))}
    </div>
  )
}
