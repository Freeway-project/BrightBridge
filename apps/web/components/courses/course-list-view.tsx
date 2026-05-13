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
import { Search as SearchIcon, AlertCircle } from "lucide-react"
import { StatCard, type StatCardIcon } from "@/components/shared/stat-card"
import { cn } from "@/lib/utils"
import type { CourseStatus } from "@coursebridge/workflow"

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

const TODO_STATUSES = new Set<CourseStatus>(["course_created", "assigned_to_ta"])
const IN_PROGRESS_STATUSES = new Set<CourseStatus>(["ta_review_in_progress", "admin_changes_requested"])
const DONE_STATUSES = new Set<CourseStatus>([
  "submitted_to_admin", "ready_for_instructor", "sent_to_instructor",
  "instructor_questions", "instructor_approved", "final_approved",
])

function getTab(course: CourseSummary): "todo" | "in_progress" | "done" {
  const { status, reviewProgress } = course
  if (TODO_STATUSES.has(status)) return "todo"
  if (IN_PROGRESS_STATUSES.has(status)) {
    if (status === "ta_review_in_progress") {
      const hasAnyWork =
        reviewProgress?.courseMetadata.exists ||
        reviewProgress?.reviewMatrix.exists ||
        reviewProgress?.syllabusReview.exists
      if (!hasAnyWork) return "todo"
    }
    return "in_progress"
  }
  return "done"
}

export function CourseListView({ initialCourses, stats, issueCounts = {} }: CourseListViewProps) {
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("all")
  const [issueSort, setIssueSort] = useState<"latest" | "replies">("latest")

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
      const matchesTerm = term === "all" || c.term === term
      return matchesSearch && matchesTerm
    })
  }, [initialCourses, search, term])

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
    <div className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
      )}

      {/* Search + term filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or course code..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {terms.length > 0 && (
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-full sm:w-[150px] sm:shrink-0">
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

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-x-2 gap-y-2 bg-transparent p-0">
          <TabItem
            value="todo"
            count={byTab.todo.length}
            label="To Do"
            textColor="text-amber-600"
            emoji="📋"
          />
          <TabItem
            value="in_progress"
            count={byTab.in_progress.length}
            label="In Progress"
            textColor="text-blue-600"
            emoji="⚙️"
          />
          <TabItem
            value="done"
            count={byTab.done.length}
            label="Done"
            textColor="text-green-600"
            emoji="✅"
          />
          <TabItem
            value="issues"
            count={byTab.issues.length}
            label="Issues"
            textColor="text-red-600"
            emoji="🔴"
          />
        </TabsList>

        {(["todo", "in_progress", "done"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <CourseGrid courses={byTab[tab]} issueCounts={issueCounts} onClear={() => { setSearch(""); setTerm("all") }} />
          </TabsContent>
        ))}

        {/* Issues Tab */}
        <TabsContent value="issues" className="mt-4">
          <div className="space-y-4">
            {byTab.issues.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Sort by:</span>
                <Select value={issueSort} onValueChange={(v) => setIssueSort(v as "latest" | "replies")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest Activity</SelectItem>
                    <SelectItem value="replies">Most Replies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <CourseGrid 
              courses={byTab.issues} 
              issueCounts={issueCounts} 
              onClear={() => { setSearch(""); setTerm("all") }}
              sortBy={issueSort}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TabItem({
  value,
  label,
  count,
  textColor,
  emoji,
}: {
  value: string
  label: string
  count: number
  textColor: string
  emoji: string
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "px-3 py-1.5 text-sm font-medium gap-1.5 flex items-center transition-colors",
        "text-foreground/60",
        `data-[state=active]:${textColor}`,
        "data-[state=active]:font-semibold",
        "hover:text-foreground/80",
      )}
    >
      <span className="text-base">{emoji}</span>
      {label}
      {count > 0 && (
        <span className={cn(
          "ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full",
          `data-[state=active]:${textColor}`,
        )}>
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
  sortBy?: "latest" | "replies"
}) {
  const sortedCourses = useMemo(() => {
    if (sortBy === "replies") {
      return [...courses].sort((a, b) => {
        const aCount = issueCounts[a.id]?.open ?? 0
        const bCount = issueCounts[b.id]?.open ?? 0
        return bCount - aCount
      })
    }
    return courses
  }, [courses, sortBy, issueCounts])

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg text-center p-8">
        <AlertCircle className="size-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">No courses here</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or term filter.</p>
        <Button variant="link" size="sm" onClick={onClear} className="mt-2">Clear filters</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {sortedCourses.map((course) => (
        <CourseCard key={course.id} course={course} issueCounts={issueCounts[course.id]} />
      ))}
    </div>
  )
}
