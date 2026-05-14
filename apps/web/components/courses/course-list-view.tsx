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
import { Search as SearchIcon, AlertCircle, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { getTab } from "@/lib/courses/tab-utils"
import type { StatCardIcon } from "@/components/shared/stat-card"

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
}

const SUBJECT_PATTERN = /^([A-Za-z]+)/

function getCourseSubject(course: CourseSummary): string | null {
  const match = course.sourceCourseId?.trim().match(SUBJECT_PATTERN)
  return match?.[1]?.toUpperCase() ?? null
}

export function CourseListView({ initialCourses, issueCounts = {} }: CourseListViewProps) {
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

  const byTab = useMemo(() => ({
    todo:        filtered.filter((c) => getTab(c) === "todo"),
    in_progress: filtered.filter((c) => getTab(c) === "in_progress"),
    done:        filtered.filter((c) => getTab(c) === "done"),
    issues:      filtered.filter((c) => (issueCounts[c.id]?.open ?? 0) > 0),
  }), [filtered, issueCounts])

  const defaultTab =
    byTab.in_progress.length > 0 ? "in_progress"
    : byTab.todo.length > 0      ? "todo"
    : "done"

  return (
    <div className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6 scrollbar-thin">
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

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="relative flex h-11 w-full items-center justify-start gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
          <TabItem
            value="todo"
            count={byTab.todo.length}
            label="To Do"
            activeColor="bg-amber-500/10 text-amber-500 border-amber-500/20"
            emoji="📋"
          />
          <TabItem
            value="in_progress"
            count={byTab.in_progress.length}
            label="In Progress"
            activeColor="bg-blue-500/10 text-blue-500 border-blue-500/20"
            emoji="⚙️"
          />
          <TabItem
            value="done"
            count={byTab.done.length}
            label="Done"
            activeColor="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            emoji="✅"
          />
          <TabItem
            value="issues"
            count={byTab.issues.length}
            label="Issues"
            activeColor="bg-destructive/10 text-destructive border-destructive/20"
            emoji="🔴"
          />
        </TabsList>

        <AnimatePresence mode="wait">
          {(["todo", "in_progress", "done"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6 focus-visible:outline-none">
              <CourseGrid 
                courses={byTab[tab]} 
                issueCounts={issueCounts} 
                onClear={() => { setSearch(""); setSubject("all"); setTerm("all") }} 
              />
            </TabsContent>
          ))}

          <TabsContent value="issues" className="mt-6 focus-visible:outline-none">
            <div className="space-y-4">
              {byTab.issues.length > 0 && (
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
                courses={byTab.issues} 
                issueCounts={issueCounts} 
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
        "relative flex h-full items-center gap-2 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-300",
        "text-muted-foreground/60 hover:text-foreground",
        "data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/40",
        `data-[state=active]:${activeColor}`,
      )}
    >
      <span className="text-base grayscale-[0.5] group-data-[state=active]:grayscale-0 transition-all">{emoji}</span>
      {label}
      {count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-current/10 text-[10px] font-black">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}

function CourseGrid({ 
  courses, 
  issueCounts, 
  onClear,
  sortBy = "latest",
}: { 
  courses: CourseSummary[]
  issueCounts: IssueCountMap
  onClear: () => void
  sortBy?: "latest" | "replies" | "open"
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
        <CourseCard key={course.id} course={course} issueCounts={issueCounts[course.id]} index={i} />
      ))}
    </div>
  )
}
