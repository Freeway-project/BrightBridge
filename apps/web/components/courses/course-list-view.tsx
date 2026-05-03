"use client"

import { useState, useMemo } from "react"
import { CourseCard } from "./course-card"
import { CourseSidebarFilters } from "./course-sidebar-filters"
import type { CourseSummary } from "@/lib/courses/service"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon } from "lucide-react"
import { StatCard, type StatCardIcon } from "@/components/shared/stat-card"

export interface CourseStat {
  label: string
  value: number | string
  icon?: StatCardIcon
}

interface CourseListViewProps {
  initialCourses: CourseSummary[]
  stats?: CourseStat[]
}

export function CourseListView({ initialCourses, stats }: CourseListViewProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [term, setTerm] = useState("all")

  const filteredCourses = useMemo(() => {
    return initialCourses.filter((course) => {
      const matchesSearch =
        !search ||
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        (course.sourceCourseId?.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus = status === "all" || course.status === status
      const matchesTerm = term === "all" || course.term === term

      return matchesSearch && matchesStatus && matchesTerm
    })
  }, [initialCourses, search, status, term])

  const clearFilters = () => {
    setSearch("")
    setStatus("all")
    setTerm("all")
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Filters</p>
        <CourseSidebarFilters
          search={search}
          status={status}
          term={term}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onTermChange={setTerm}
          onClear={clearFilters}
        />
      </aside>

      {/* Course list */}
      <main className="flex-1 overflow-y-auto bg-background p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCourses.length} of {initialCourses.length} courses
          </p>
        </div>

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} />
            ))}
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg text-center p-12">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <SearchIcon className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No courses found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or search query.
            </p>
            <Button variant="link" onClick={clearFilters} className="mt-4">
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
