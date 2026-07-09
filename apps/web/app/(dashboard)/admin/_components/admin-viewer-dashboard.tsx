"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Users,
} from "lucide-react"
import type { AdminCourseRow, AdminCoursesPage, AdminOverviewData } from "@/lib/admin/queries"
import type { StatusCount } from "@/lib/repositories/contracts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchBar } from "@/components/ui/search-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/courses/status-badge"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { PhaseBreakdown } from "@/components/admin/stats/phase-breakdown"
import { cn } from "@/lib/utils"
import { COURSE_STATUS_LABELS, getPhaseBreakdown, WORKFLOW_PHASES } from "@coursebridge/workflow"
import type { CourseStatus } from "@coursebridge/workflow"

type Props = {
  overviewData: AdminOverviewData
  coursesPage: AdminCoursesPage
  statusCounts: StatusCount[]
}

export function AdminViewerDashboard({ overviewData, coursesPage, statusCounts }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [selectedCourse, setSelectedCourse] = useState<AdminCourseRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "")

  const statusFilter = searchParams.get("status") ?? "all"
  const currentPage = Math.max(coursesPage.page, 1)

  const countByStatus: Partial<Record<CourseStatus, number>> = Object.fromEntries(
    statusCounts.map((s) => [s.status, s.count]),
  )
  const breakdown = getPhaseBreakdown(countByStatus)
  const completed = countByStatus["final_approved"] ?? 0
  const completedPct = overviewData.totalCourses > 0
    ? Math.round((completed / overviewData.totalCourses) * 100)
    : 0
  const inProgress = Math.max(0, overviewData.totalCourses - completed)

  function pushParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") params.set(key, value)
    else params.delete(key)
    params.delete("page")
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function openSheet(course: AdminCourseRow) {
    setSelectedCourse(course)
    setSheetOpen(true)
  }

  const allStatuses = WORKFLOW_PHASES.flatMap((p) => p.groups.flatMap((g) => g.statuses))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Courses" value={overviewData.totalCourses} icon="book-open" index={0} />
        <StatCard label="Completed" value={completed} icon="check-square" sub={`${completedPct}%`} index={1} />
        <StatCard label="In Progress" value={inProgress} icon="clock" index={2} />
        <StatCard label="Staff" value={overviewData.taWorkload.length} icon="user-check" index={3} />
      </div>

      {/* Phase breakdown + workload */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PhaseBreakdown breakdown={breakdown} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Staff Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {overviewData.taWorkload.length === 0 ? (
              <p className="text-xs text-muted-foreground">No staff assigned.</p>
            ) : (
              overviewData.taWorkload.map((ta) => (
                <div key={ta.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ta.full_name ?? ta.email}</p>
                    {ta.full_name && <p className="truncate text-[11px] text-muted-foreground">{ta.email}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{ta.active_courses} active</Badge>
                    {ta.needs_fixes > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{ta.needs_fixes} fixes</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course list */}
      <Card>
        <CardHeader className="gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">All Courses</CardTitle>
            <p className="text-sm text-muted-foreground">
              {coursesPage.total.toLocaleString()} courses — click any row to view details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              containerClassName="w-52"
              value={searchInput}
              onValueChange={setSearchInput}
              onSearch={(v) => pushParam("search", v)}
              debounceMs={350}
              placeholder="Search courses…"
            />

            <Select value={statusFilter} onValueChange={(v) => pushParam("status", v)}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {COURSE_STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6 text-xs">Code</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="hidden text-xs sm:table-cell">Term</TableHead>
                  <TableHead className="hidden text-xs md:table-cell">Department</TableHead>
                  <TableHead className="text-xs">Staff (TA)</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coursesPage.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No courses match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  coursesPage.data.map((course) => (
                    <TableRow
                      key={course.id}
                      onClick={() => openSheet(course)}
                      className={cn(
                        "cursor-pointer border-border transition-colors",
                        selectedCourse?.id === course.id && sheetOpen && "bg-primary/5",
                      )}
                    >
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                        {course.sourceCourseId ?? course.targetCourseId ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[22rem] whitespace-normal break-words text-sm font-medium">
                        {course.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={course.status} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {course.term ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {course.department ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {course.ta?.name ?? course.ta?.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground/50" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-6 py-4">
            <PaginationControls
              page={currentPage}
              totalPages={coursesPage.totalPages}
              totalItems={coursesPage.total}
            />
          </div>
        </CardContent>
      </Card>

      {/* Right-side detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-[480px] max-w-[90vw] flex-col gap-0 p-0">
          {selectedCourse && <CourseDetailSheet course={selectedCourse} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function CourseDetailSheet({ course }: { course: AdminCourseRow }) {
  const code = course.sourceCourseId ?? course.targetCourseId
  const updatedAt = new Date(course.updatedAt)
  const phase = WORKFLOW_PHASES.find((p) =>
    p.groups.some((g) => g.statuses.includes(course.status as CourseStatus)),
  )

  return (
    <>
      <SheetHeader className="border-b border-border px-6 py-5">
        <div className="space-y-1">
          {code && (
            <p className="font-mono text-xs text-muted-foreground">{code}</p>
          )}
          <SheetTitle className="text-lg leading-snug">{course.title}</SheetTitle>
          {course.term && (
            <SheetDescription className="text-xs">{course.term}</SheetDescription>
          )}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {/* Status */}
        <Section icon={<ExternalLink />} label="Status">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={course.status} />
            {phase && (
              <Badge variant="outline" className="text-[10px]">{phase.label} phase</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {COURSE_STATUS_LABELS[course.status] ?? course.status}
          </p>
        </Section>

        {/* Details */}
        <Section icon={<BookOpen />} label="Details">
          <dl className="space-y-2 text-sm">
            {course.department && (
              <Row label="Department" value={course.department} />
            )}
            {course.term && (
              <Row label="Term" value={course.term} />
            )}
            <Row
              label="Last updated"
              value={updatedAt.toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
          </dl>
        </Section>

        {/* Assignments */}
        <Section icon={<Users />} label="Assignments">
          <dl className="space-y-2 text-sm">
            <Row
              label="Staff (TA)"
              value={course.ta
                ? (course.ta.name ?? course.ta.email)
                : "Unassigned"}
              muted={!course.ta}
            />
            <Row
              label="Instructor"
              value={course.instructor
                ? (course.instructor.name ?? course.instructor.email)
                : "Not assigned"}
              muted={!course.instructor}
            />
          </dl>
        </Section>

        {/* Review notes */}
        {course.instructorSummaryNotes && (
          <Section icon={<BookOpen />} label="Summary notes">
            <p className="whitespace-pre-wrap text-sm text-foreground/80">
              {course.instructorSummaryNotes}
            </p>
          </Section>
        )}
      </div>

      {/* Footer: open full course */}
      <div className="border-t border-border px-6 py-4">
        <Button asChild className="w-full" variant="outline">
          <a href={`/admin/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 size-4" />
            Open full course
          </a>
        </Button>
      </div>
    </>
  )
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border px-6 py-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="[&>svg]:size-3.5">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", muted && "text-muted-foreground italic")}>{value}</dd>
    </div>
  )
}

