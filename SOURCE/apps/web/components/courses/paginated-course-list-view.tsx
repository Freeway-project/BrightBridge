"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { CourseCard } from "./course-card"
import type { CourseSummary, AccessibleCourseAggregates, PaginatedResult } from "@/lib/repositories/contracts"
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
import { Search as SearchIcon, AlertCircle, Filter, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { WORKFLOW_PHASES, getPipelineStage, type CourseStatus, type PipelineStage } from "@coursebridge/workflow"
import {
  loadAccessibleCourseAggregatesAction,
  loadAccessibleCoursesPageAction,
} from "@/app/(dashboard)/courses/actions"

const PHASE_STYLE: Record<PipelineStage, { emoji: string; activeColor: string }> = {
  migration: { emoji: "🧭", activeColor: "text-blue-500 after:bg-blue-500" },
  staging: { emoji: "🛠️", activeColor: "text-orange-500 after:bg-orange-500" },
  instructor: { emoji: "🎓", activeColor: "text-violet-500 after:bg-violet-500" },
  provision: { emoji: "✅", activeColor: "text-emerald-500 after:bg-emerald-500" },
}

interface PaginatedCourseListViewProps {
  aggregates: AccessibleCourseAggregates
  initialStatus?: CourseStatus
  initialPage: PaginatedResult<CourseSummary>
  pageSize: number
  canExport?: boolean
  scrollable?: boolean
}

type Filters = { search: string; subject: string; term: string }
const EMPTY_FILTERS: Filters = { search: "", subject: "all", term: "all" }

function phaseStatusCount(
  statusCounts: AccessibleCourseAggregates["statusCounts"],
  statuses: readonly CourseStatus[],
) {
  return statuses.reduce((n, s) => n + (statusCounts[s] ?? 0), 0)
}

function defaultStatusForPhase(
  phaseKey: PipelineStage,
  statusCounts: AccessibleCourseAggregates["statusCounts"],
): CourseStatus | undefined {
  const phase = WORKFLOW_PHASES.find((p) => p.key === phaseKey)
  if (!phase) return undefined
  for (const group of phase.groups) {
    for (const s of group.statuses) {
      if ((statusCounts[s] ?? 0) > 0) return s
    }
  }
  return phase.groups[0]?.statuses[0]
}

export function PaginatedCourseListView({
  aggregates: initialAggregates,
  initialStatus,
  initialPage,
  pageSize,
  canExport = false,
  scrollable = true,
}: PaginatedCourseListViewProps) {
  const [aggregates, setAggregates] = useState(initialAggregates)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<CourseStatus | undefined>(initialStatus)
  const [courses, setCourses] = useState<CourseSummary[]>(initialPage.data)
  const [page, setPage] = useState<number>(initialPage.page)
  const [total, setTotal] = useState<number>(initialPage.total)
  const [isFetching, startFetching] = useTransition()
  const fetchSeq = useRef(0)
  // Skip the first effect run — the SSR'd initialPage already covers it.
  const isFirstRun = useRef(true)

  // 250ms tuned to "feels live, doesn't thrash the DB."
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 250)
    return () => clearTimeout(t)
  }, [filters.search])

  const filterArgs = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      subject: filters.subject === "all" ? undefined : filters.subject,
      term: filters.term === "all" ? undefined : filters.term,
    }),
    [debouncedSearch, filters.subject, filters.term],
  )

  const activePhase: PipelineStage = activeStatus ? getPipelineStage(activeStatus) : "migration"

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (!activeStatus) {
      setCourses([])
      setTotal(0)
      setPage(1)
      return
    }
    const seq = ++fetchSeq.current
    startFetching(() => {
      Promise.all([
        loadAccessibleCoursesPageAction({ page: 1, pageSize, status: activeStatus, ...filterArgs }),
        loadAccessibleCourseAggregatesAction(filterArgs),
      ])
        .then(([pageResult, aggResult]) => {
          if (seq !== fetchSeq.current) return
          setCourses(pageResult.data)
          setPage(pageResult.page)
          setTotal(pageResult.total)
          setAggregates(aggResult)
        })
        .catch(() => {
          // Soft-fail: keep the prior grid in place rather than wiping it on
          // a transient error. The next filter/tab change retries.
        })
    })
  }, [activeStatus, filterArgs, pageSize])

  const loadMore = useCallback(() => {
    if (!activeStatus) return
    if (courses.length >= total) return
    const nextPage = page + 1
    const seq = ++fetchSeq.current
    startFetching(() => {
      loadAccessibleCoursesPageAction({
        page: nextPage,
        pageSize,
        status: activeStatus,
        ...filterArgs,
      })
        .then((result) => {
          if (seq !== fetchSeq.current) return
          setCourses((prev) => [...prev, ...result.data])
          setPage(result.page)
          setTotal(result.total)
        })
        .catch(() => {
          // ignore — user can scroll again to retry
        })
    })
  }, [activeStatus, courses.length, total, page, pageSize, filterArgs])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) loadMore()
      },
      { rootMargin: "200px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, isFetching])

  const onPhaseChange = (next: string) => {
    const stage = next as PipelineStage
    const nextStatus = defaultStatusForPhase(stage, aggregates.statusCounts)
    if (nextStatus) setActiveStatus(nextStatus)
  }

  const onSubGroupChange = (next: string) => setActiveStatus(next as CourseStatus)

  const clearFilters = () => setFilters(EMPTY_FILTERS)

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
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="h-8 w-px bg-border/40 hidden sm:block" />
          <Filter className="size-4 text-muted-foreground hidden sm:block" />
          {aggregates.subjects.length > 0 && (
            <Select
              value={filters.subject}
              onValueChange={(v) => setFilters((f) => ({ ...f, subject: v }))}
            >
              <SelectTrigger className="h-9 w-full border-none bg-transparent shadow-none focus:ring-0 sm:w-[150px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {aggregates.subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {aggregates.terms.length > 0 && (
            <Select
              value={filters.term}
              onValueChange={(v) => setFilters((f) => ({ ...f, term: v }))}
            >
              <SelectTrigger className="h-9 w-full border-none bg-transparent shadow-none focus:ring-0 sm:w-[150px]">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {aggregates.terms.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </motion.div>

      <Tabs value={activePhase} onValueChange={onPhaseChange} className="w-full">
        <TabsList className="relative flex h-10 w-full items-center justify-start gap-6 border-b border-border/40 bg-transparent p-0 rounded-none">
          {WORKFLOW_PHASES.map((phase) => (
            <TabItem
              key={phase.key}
              value={phase.key}
              count={phaseStatusCount(
                aggregates.statusCounts,
                phase.groups.flatMap((g) => g.statuses),
              )}
              label={phase.label}
              activeColor={PHASE_STYLE[phase.key].activeColor}
              emoji={PHASE_STYLE[phase.key].emoji}
            />
          ))}
        </TabsList>

        {WORKFLOW_PHASES.map((phase) => {
          if (phase.groups.length === 1) {
            const status = phase.groups[0].statuses[0]
            const isActive = status === activeStatus
            return (
              <TabsContent key={phase.key} value={phase.key} className="mt-6 focus-visible:outline-none">
                <CourseGrid
                  courses={isActive ? courses : []}
                  total={isActive ? total : (aggregates.statusCounts[status] ?? 0)}
                  isFetching={isActive && isFetching}
                  canExport={canExport}
                  onClear={clearFilters}
                  sentinelRef={isActive ? sentinelRef : null}
                />
              </TabsContent>
            )
          }
          const subValue = activeStatus && phase.groups.some((g) => g.statuses.includes(activeStatus))
            ? activeStatus
            : phase.groups[0].statuses[0]
          return (
            <TabsContent key={phase.key} value={phase.key} className="mt-6 focus-visible:outline-none">
              <Tabs value={subValue} onValueChange={onSubGroupChange} className="w-full">
                <TabsList className="flex-wrap gap-2 h-auto bg-transparent p-0">
                  {phase.groups.map((group) => {
                    const status = group.statuses[0]
                    return (
                      <TabsTrigger
                        key={group.key}
                        value={status}
                        className={cn(
                          "group gap-2 px-4 py-2 rounded-full border shadow-sm transition-all",
                          "border-border/40 bg-background hover:bg-muted/50 hover:border-border/80",
                          "data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_var(--color-primary)]",
                        )}
                      >
                        <span className="font-semibold">{group.label}</span>
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold transition-colors",
                          "bg-muted text-muted-foreground",
                          "group-data-[state=active]:bg-primary/20 group-data-[state=active]:text-primary",
                        )}>
                          {aggregates.statusCounts[status] ?? 0}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {phase.groups.map((group) => {
                  const status = group.statuses[0]
                  const isActive = status === activeStatus
                  return (
                    <TabsContent key={group.key} value={status} className="mt-6 focus-visible:outline-none">
                      <CourseGrid
                        courses={isActive ? courses : []}
                        total={isActive ? total : (aggregates.statusCounts[status] ?? 0)}
                        isFetching={isActive && isFetching}
                        canExport={canExport}
                        onClear={clearFilters}
                        sentinelRef={isActive ? sentinelRef : null}
                      />
                    </TabsContent>
                  )
                })}
              </Tabs>
            </TabsContent>
          )
        })}
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
        "group-data-[state=active]:bg-current/10 group-data-[state=active]:text-current",
      )}>
        {count}
      </span>
    </TabsTrigger>
  )
}

function CourseGrid({
  courses,
  total,
  isFetching,
  canExport = false,
  onClear,
  sentinelRef,
}: {
  courses: CourseSummary[]
  total: number
  isFetching: boolean
  canExport?: boolean
  onClear: () => void
  sentinelRef: React.RefObject<HTMLDivElement | null> | null
}) {
  if (courses.length === 0 && !isFetching) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/5 p-12 text-center"
      >
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/20">
          <AlertCircle className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-base font-bold text-foreground">
          {total > 0 ? "No courses on this page" : "No courses found"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Adjust your filters or try a different search term.</p>
        <Button variant="outline" size="sm" onClick={onClear} className="mt-6 border-border/60">
          Clear filters
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {courses.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} canExport={canExport} />
        ))}
      </div>
      {sentinelRef && courses.length < total && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          {isFetching ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading more…
            </>
          ) : (
            <span className="opacity-60">Scroll for more</span>
          )}
        </div>
      )}
      {courses.length > 0 && courses.length >= total && (
        <p className="py-2 text-center text-xs text-muted-foreground/60">
          Showing all {total} {total === 1 ? "course" : "courses"}.
        </p>
      )}
    </div>
  )
}
