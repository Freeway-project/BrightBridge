"use client"

import { useState, useMemo } from "react"
import { CourseCard } from "./course-card"
import { CourseSidebarFilters } from "./course-sidebar-filters"
import type { CourseSummary } from "@/lib/courses/service"
import { Button } from "@/components/ui/button"
import { Plus, Filter, Search as SearchIcon } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface CourseListViewProps {
  initialCourses: CourseSummary[]
}

export function CourseListView({ initialCourses }: CourseListViewProps) {
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">
            Showing {filteredCourses.length} courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Filter className="mr-2 size-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="py-6">
                <CourseSidebarFilters
                  search={search}
                  status={status}
                  term={term}
                  onSearchChange={setSearch}
                  onStatusChange={setStatus}
                  onTermChange={setTerm}
                  onClear={clearFilters}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            New Course
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-border bg-card/50 p-6 overflow-y-auto">
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
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
            <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
