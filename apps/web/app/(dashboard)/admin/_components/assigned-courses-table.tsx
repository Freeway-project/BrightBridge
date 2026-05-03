"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { AdminCourseRow, AdminCoursesPage } from "@/lib/admin/queries"
import type { ProfileOption } from "@/lib/repositories/contracts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/courses/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Search, SlidersHorizontal, CheckCircle2, Circle, Loader2 } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"

type Props = {
  page: AdminCoursesPage
  tas: ProfileOption[]
}

export function AssignedCoursesTable({ page, tas }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "")

  const search = searchParams.get("search") ?? ""
  const statusFilter = searchParams.get("status") ?? "all"
  const taFilter = searchParams.get("ta") ?? "all"
  const currentPage = Math.max(page.page, 1)

  const taOptions = useMemo(
    () =>
      tas
        .map((ta) => ({
          id: ta.id,
          label: ta.fullName ?? ta.email,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tas]
  )

  const filteredCourses = page.data

  const visibleTaCount = new Set(
    filteredCourses.map((course) => course.ta?.id).filter((value): value is string => Boolean(value))
  ).size

  const unassigned = filteredCourses.filter((course) => course.status === "course_created").length
  const waitingForAdmin = filteredCourses.filter((course) => course.status === "submitted_to_admin").length
  const backWithTa = filteredCourses.filter((course) => course.status === "admin_changes_requested").length
  const readyForInstructor = filteredCourses.filter((course) => course.status === "ready_for_instructor").length
  const pageStart = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1
  const pageEnd = page.total === 0 ? 0 : pageStart + filteredCourses.length - 1

  function clearFilters() {
    setSearchInput("")
    setQuery({
      page: "1",
      search: null,
      status: null,
      ta: null,
    })
  }

  function setQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
  }

  function applySearch() {
    setQuery({
      page: "1",
      search: searchInput.trim() || null,
    })
  }

  function goToPage(nextPage: number) {
    setQuery({
      page: String(nextPage),
    })
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-base">
              All Courses
              <span className="ml-2 text-sm font-normal text-muted-foreground">({page.total.toLocaleString()})</span>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Track all courses, assignments, review progress, and workflow status.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            Showing {pageStart}-{pageEnd} of {page.total}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-[var(--card-spacing,1rem)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex flex-1 items-center gap-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  applySearch()
                }
              }}
              placeholder="Search by title, source ID, term, department, or TA..."
              className="pl-9 pr-3"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-[84px] top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchInput(""); setQuery({ page: "1", search: null }) }}
              >
                ×
              </Button>
            )}
            <Button size="sm" onClick={applySearch} className="shrink-0">
              Search
            </Button>
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setQuery({
                  page: "1",
                  status: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="course_created">Not yet assigned</SelectItem>
                <SelectItem value="assigned_to_ta">Assigned to TA</SelectItem>
                <SelectItem value="ta_review_in_progress">TA Review In Progress</SelectItem>
                <SelectItem value="submitted_to_admin">Submitted to Admin</SelectItem>
                <SelectItem value="admin_changes_requested">Admin Changes Requested</SelectItem>
                <SelectItem value="ready_for_instructor">Ready for Instructor</SelectItem>
                <SelectItem value="sent_to_instructor">Sent to Instructor</SelectItem>
                <SelectItem value="instructor_questions">Instructor Questions</SelectItem>
                <SelectItem value="instructor_approved">Instructor Approved</SelectItem>
                <SelectItem value="final_approved">Final Approved</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={taFilter}
              onValueChange={(value) =>
                setQuery({
                  page: "1",
                  ta: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by TA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All TAs</SelectItem>
                {taOptions.map((ta) => (
                  <SelectItem key={ta.id} value={ta.id}>
                    {ta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Needs TA Assigned" value={unassigned} tone={unassigned > 0 ? "warn" : "default"} />
          <SummaryStat label="Active TAs" value={visibleTaCount} tone="default" />
          <SummaryStat label="Waiting on Admin" value={waitingForAdmin} tone={waitingForAdmin > 0 ? "warn" : "default"} />
          <SummaryStat
            label={backWithTa > 0 ? "Back With TA" : "Ready For Instructor"}
            value={backWithTa > 0 ? backWithTa : readyForInstructor}
            tone={backWithTa > 0 ? "danger" : "success"}
          />
        </div>

        {filteredCourses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No courses match these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust the search or filter settings to widen the results.
            </p>
            <Button variant="ghost" className="mt-3" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs">Course</TableHead>
                  <TableHead className="text-xs">Assigned TA</TableHead>
                  <TableHead className="text-xs">Pipeline</TableHead>
                  <TableHead className="text-xs">Workflow</TableHead>
                  <TableHead className="pr-4 text-right text-xs">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer border-b border-border/70 hover:bg-muted/40"
                    onClick={() => router.push(`/admin/courses/${course.id}`)}
                  >
                    <TableCell className="pl-4 align-top">
                      <div className="space-y-2 py-1">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{course.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {course.sourceCourseId ?? "No source course ID"}
                            {course.targetCourseId ? ` -> ${course.targetCourseId}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {course.term ? <InfoChip label={course.term} /> : null}
                          {course.department ? <InfoChip label={course.department} /> : null}
                          <InfoChip label="Open review" subtle={false} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {course.ta ? (
                        <div className="flex items-start gap-3 py-1">
                          <Avatar>
                            <AvatarFallback>{getInitials(course.ta.name ?? course.ta.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-foreground">{course.ta.name ?? "Unnamed TA"}</p>
                            <p className="truncate text-xs text-muted-foreground">{course.ta.email}</p>
                            <p className="text-[11px] text-muted-foreground">Current TA owner</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <WorkflowPipeline status={course.status} />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2 py-1">
                        <StatusBadge status={course.status} className="w-fit" />
                        <p className="text-xs text-muted-foreground">{getStatusHint(course.status)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right align-top">
                      <div className="space-y-1 py-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {new Date(course.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p>
                          {new Date(course.updatedAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p>Last activity</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {page.total === 0
              ? "No courses"
              : `Showing ${pageStart}–${pageEnd} of ${page.total.toLocaleString()} courses`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(1)}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="min-w-[80px] text-center text-xs text-muted-foreground">
              Page {currentPage} of {Math.max(page.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= page.totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= page.totalPages}
              onClick={() => goToPage(page.totalPages)}
            >
              Last
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type PhaseState = "done" | "active" | "idle"

const DONE_1 = new Set<CourseStatus>(["submitted_to_admin", "ready_for_instructor", "sent_to_instructor", "instructor_questions", "instructor_approved", "final_approved"])
const ACTIVE_1 = new Set<CourseStatus>(["ta_review_in_progress", "admin_changes_requested"])
const DONE_2 = new Set<CourseStatus>(["sent_to_instructor", "instructor_questions", "instructor_approved", "final_approved"])
const ACTIVE_2 = new Set<CourseStatus>(["ready_for_instructor"])
const DONE_3 = new Set<CourseStatus>(["instructor_approved", "final_approved"])
const ACTIVE_3 = new Set<CourseStatus>(["sent_to_instructor", "instructor_questions"])

function phaseState(s: CourseStatus, done: Set<CourseStatus>, active: Set<CourseStatus>): PhaseState {
  return done.has(s) ? "done" : active.has(s) ? "active" : "idle"
}

function WorkflowPipeline({ status }: { status: CourseStatus }) {
  const phases: { label: string; state: PhaseState }[] = [
    { label: "TA Forms", state: phaseState(status, DONE_1, ACTIVE_1) },
    { label: "Staging",  state: phaseState(status, DONE_2, ACTIVE_2) },
    { label: "Review",   state: phaseState(status, DONE_3, ACTIVE_3) },
  ]

  return (
    <div className="flex items-center gap-1 py-1">
      {phases.map((phase, i) => (
        <div key={phase.label} className="flex items-center gap-1">
          {i > 0 && <div className="h-px w-3 shrink-0 bg-border" />}
          <PhasePill label={phase.label} state={phase.state} />
        </div>
      ))}
    </div>
  )
}

function PhasePill({ label, state }: { label: string; state: PhaseState }) {
  const styles = {
    done:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
    active: "bg-orange-500/15 text-orange-600 border-orange-400/30",
    idle:   "bg-muted text-muted-foreground border-border",
  }[state]

  const Icon = state === "done" ? CheckCircle2 : state === "active" ? Loader2 : Circle

  return (
    <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5", styles)}>
      <Icon className={cn("size-2.5 shrink-0", state === "active" && "animate-spin")} />
      <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "default" | "warn" | "danger" | "success"
}) {
  const toneClass = {
    default: "border-border bg-muted/30 text-foreground",
    warn: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    danger: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    success: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
  }[tone]

  return (
    <div className={cn("rounded-lg border px-4 py-3", toneClass)}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function InfoChip({ label, subtle = true }: { label: string; subtle?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0 text-[10px] font-medium",
        subtle ? "text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary"
      )}
    >
      {label}
    </Badge>
  )
}

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getStatusHint(status: AdminCourseRow["status"]) {
  switch (status) {
    case "course_created":
      return "No TA assigned yet — needs assignment."
    case "assigned_to_ta":
      return "Assigned and waiting for TA work to begin."
    case "ta_review_in_progress":
      return "TA is actively reviewing the course."
    case "submitted_to_admin":
      return "Admin decision needed now."
    case "admin_changes_requested":
      return "Returned to the TA for fixes."
    case "ready_for_instructor":
      return "Approved by admin and ready for handoff."
    case "sent_to_instructor":
      return "Instructor review is in progress."
    case "instructor_questions":
      return "Instructor sent questions back into the workflow."
    case "instructor_approved":
      return "Waiting for final admin completion."
    case "final_approved":
      return "Course review is complete."
    default:
      return "Course is in the workflow."
  }
}
