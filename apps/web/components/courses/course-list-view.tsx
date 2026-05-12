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
import { Search as SearchIcon } from "lucide-react"
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

function getTab(status: CourseStatus): "todo" | "in_progress" | "done" {
  if (TODO_STATUSES.has(status)) return "todo"
  if (IN_PROGRESS_STATUSES.has(status)) return "in_progress"
  return "done"
}

export function CourseListView({ initialCourses, stats, issueCounts = {} }: CourseListViewProps) {
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("all")

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
    todo:        filtered.filter((c) => getTab(c.status) === "todo"),
    in_progress: filtered.filter((c) => getTab(c.status) === "in_progress"),
    done:        filtered.filter((c) => getTab(c.status) === "done"),
  }), [filtered])

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
        <TabsList className="h-auto w-full flex-wrap justify-start gap-x-1 gap-y-1 rounded-none border-b border-border bg-transparent p-0">
          <TabItem value="todo" count={byTab.todo.length} label="To Do" activeColor="text-amber-600 border-amber-500" />
          <TabItem value="in_progress" count={byTab.in_progress.length} label="In Progress" activeColor="text-blue-600 border-blue-500" />
          <TabItem value="done" count={byTab.done.length} label="Done" activeColor="text-green-600 border-green-500" />
        </TabsList>

        {(["todo", "in_progress", "done"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <CourseGrid courses={byTab[tab]} issueCounts={issueCounts} onClear={() => { setSearch(""); setTerm("all") }} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function TabItem({
  value,
  label,
  count,
  activeColor,
}: {
  value: string
  label: string
  count: number
  activeColor: string
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-2.5 pt-1 text-sm font-medium text-muted-foreground shadow-none transition-colors",
        "data-[state=active]:shadow-none data-[state=active]:bg-transparent",
        `data-[state=active]:${activeColor.split(" ")[0]}`,
        `data-[state=active]:${activeColor.split(" ")[1]}`,
      )}
    >
      {label}
      <span className={cn(
        "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        count > 0 ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground",
      )}>
        {count}
      </span>
    </TabsTrigger>
  )
}

function CourseGrid({ courses, issueCounts, onClear }: { courses: CourseSummary[]; issueCounts: IssueCountMap; onClear: () => void }) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg text-center p-8">
        <SearchIcon className="size-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">No courses here</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or term filter.</p>
        <Button variant="link" size="sm" onClick={onClear} className="mt-2">Clear filters</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} issueCounts={issueCounts[course.id]} />
      ))}
    </div>
  )
}
