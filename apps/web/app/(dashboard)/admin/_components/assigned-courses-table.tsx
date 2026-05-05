"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
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
import { Search, SlidersHorizontal, CheckCircle2, Circle, Loader2, BookOpen } from "lucide-react"
import type { CourseStatus } from "@coursebridge/workflow"

type Props = {
  page: AdminCoursesPage
  tas: ProfileOption[]
}

export function AssignedCoursesTable({ page, tas }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
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

  const migration = filteredCourses.filter((c) => c.status === "course_created" || c.status === "assigned_to_ta" || c.status === "ta_review_in_progress").length
  const staging = filteredCourses.filter((c) => {
    const s = c.status
    return s === "submitted_to_admin" || s === "admin_changes_requested" ||
           s === "ready_for_instructor" || s === "sent_to_instructor" || s === "instructor_questions" || s === "instructor_approved"
  }).length
  const needsAction = filteredCourses.filter((c) => c.status === "submitted_to_admin" || c.status === "instructor_approved").length
  const provision = filteredCourses.filter((c) => c.status === "final_approved").length

  const pendingAssignment = filteredCourses.filter(c => c.status === "course_created").length
  const inReview = filteredCourses.filter(c => c.status === "assigned_to_ta" || c.status === "ta_review_in_progress").length

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

    startTransition(() => {
      router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const trimmedInput = searchInput.trim()
    if (trimmedInput === search) {
      return
    }

    const timer = setTimeout(() => {
      setQuery({
        page: "1",
        search: trimmedInput || null,
      })
    }, 350)

    return () => {
      clearTimeout(timer)
    }
  }, [searchInput, search, searchParams, pathname])

  function goToPage(nextPage: number) {
    setQuery({
      page: String(nextPage),
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPIStat label="Total Courses" value={page.total} />
        <KPIStat
          label="Pending Assignment"
          value={pendingAssignment}
          stage="unassigned"
        />
        <KPIStat
          label="In Review"
          value={inReview}
          stage="ta-review"
        />
        <KPIStat
          label="Needs Action"
          value={needsAction}
          variant="destructive"
        />
      </div>

      <Card className="border-[--border-default] bg-[--surface-2]">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="rounded-md bg-[--stage-ta-review]/15 p-1.5 text-[--stage-ta-review]">
                  <BookOpen className="size-4" />
                </div>
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
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex flex-1 items-center gap-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, IDs, term, department, TA name..."
                className="pl-9 pr-3 bg-[--surface-4] border-[--border-default]"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => { setSearchInput(""); setQuery({ page: "1", search: null }) }}
                >
                  ×
                </Button>
              )}
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
                <SelectTrigger className="w-[200px] bg-[--surface-4] border-[--border-default]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto bg-[--surface-3] border-[--border-default]">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="course_created">Migration — unassigned</SelectItem>
                  <SelectItem value="assigned_to_ta">Migration — assigned to TA</SelectItem>
                  <SelectItem value="ta_review_in_progress">Migration — TA reviewing</SelectItem>
                  <SelectItem value="submitted_to_admin">Staging — waiting on admin</SelectItem>
                  <SelectItem value="admin_changes_requested">Staging — fixes requested</SelectItem>
                  <SelectItem value="ready_for_instructor">Staging — ready to send</SelectItem>
                  <SelectItem value="sent_to_instructor">Staging — instructor reviewing</SelectItem>
                  <SelectItem value="instructor_questions">Staging — instructor questions</SelectItem>
                  <SelectItem value="instructor_approved">Staging — awaiting final sign-off</SelectItem>
                  <SelectItem value="final_approved">Provision — final approved</SelectItem>
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
                <SelectTrigger className="w-[160px] bg-[--surface-4] border-[--border-default]">
                  <SelectValue placeholder="Filter by TA" />
                </SelectTrigger>
                <SelectContent className="bg-[--surface-3] border-[--border-default]">
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

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              {search
                ? <>Results for <span className="font-medium text-foreground">"{search}"</span></>
                : "Showing all courses"}
            </p>
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                Searching…
              </span>
            ) : null}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[--border-default] px-6 py-12 text-center bg-[--surface-1]/50">
              <p className="text-sm font-medium text-foreground">No courses match these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the search or filter settings to widen the results.
              </p>
              <Button variant="ghost" className="mt-3" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[--border-default]">
              <Table>
                <TableHeader className="bg-[--surface-4]">
                  <TableRow className="hover:bg-transparent border-b border-[--border-subtle]">
                    <TableHead className="pl-4 text-xs uppercase tracking-wider text-muted-foreground h-10">Course</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-10">Assigned TA</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-10">Pipeline</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground h-10">Workflow</TableHead>
                    <TableHead className="pr-4 text-right text-xs uppercase tracking-wider text-muted-foreground h-10">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => {
                    const stage = getPipelineStage(course.status)
                    return (
                      <TableRow
                        key={course.id}
                        className="cursor-pointer border-b border-[--border-subtle] transition-colors hover:bg-[--surface-3]/50 active:bg-[--surface-3]"
                        style={{ borderLeft: `2px solid var(--stage-${stage})` }}
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
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-[--surface-4] text-[10px]">{getInitials(course.ta.name ?? course.ta.email)}</AvatarFallback>
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
                            <PipelineBadge stage={stage} label={getStatusLabel(course.status)} />
                            <p className="text-xs text-muted-foreground">{getStatusHint(course.status)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 text-right align-top">
                          <div className="space-y-1 py-1 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">
                              {new Date(course.updatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                              })}
                            </p>
                            <p>
                              {new Date(course.updatedAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: "UTC",
                              })}
                            </p>
                            <p>Last activity</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-[--border-subtle] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {page.total === 0
                ? "No courses"
                : `Showing ${pageStart}–${pageEnd} of ${page.total.toLocaleString()} courses`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-[--surface-3] border-[--border-default]"
                disabled={currentPage <= 1}
                onClick={() => goToPage(1)}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[--surface-3] border-[--border-default]"
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
                className="bg-[--surface-3] border-[--border-default]"
                disabled={currentPage >= page.totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[--surface-3] border-[--border-default]"
                disabled={currentPage >= page.totalPages}
                onClick={() => goToPage(page.totalPages)}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KPIStat({
  label,
  value,
  stage,
  variant = "default",
}: {
  label: string
  value: number
  stage?: PipelineStage
  variant?: "default" | "destructive"
}) {
  const borderClass = stage
    ? `border-l-2 border-l-[var(--stage-${stage})]`
    : variant === "destructive"
    ? "border-l-2 border-l-[var(--destructive)]"
    : ""

  return (
    <div className={cn(
      "rounded-lg border border-[--border-default] bg-[--surface-2] px-4 py-3",
      borderClass
    )}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  )
}

type PipelineStage = "unassigned" | "ta-review" | "admin-review" | "comms" | "instructor" | "approved"

function getPipelineStage(status: CourseStatus): PipelineStage {
  if (status === "course_created") return "unassigned"
  if (status === "assigned_to_ta" || status === "ta_review_in_progress") return "ta-review"
  if (status === "submitted_to_admin" || status === "admin_changes_requested") return "admin-review"
  if (status === "ready_for_instructor") return "comms"
  if (status === "sent_to_instructor" || status === "instructor_questions" || status === "instructor_approved") return "instructor"
  if (status === "final_approved") return "approved"
  return "ta-review"
}

function PipelineBadge({ stage, label }: { stage: PipelineStage; label: string }) {
  return (
    <div
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border"
      style={{
        background: `color-mix(in oklch, var(--stage-${stage}) 12%, transparent)`,
        color: `var(--stage-${stage})`,
        borderColor: `color-mix(in oklch, var(--stage-${stage}) 25%, transparent)`,
      }}
    >
      {label}
    </div>
  )
}

function WorkflowPipeline({ status }: { status: CourseStatus }) {
  const currentStage = getPipelineStage(status)
  const stages: { label: string; stage: PipelineStage }[] = [
    { label: "Migration", stage: "ta-review" },
    { label: "Staging", stage: "admin-review" },
    { label: "Provision", stage: "approved" },
  ]

  // Logic to determine if a stage is done, active or idle
  const isDone = (s: PipelineStage) => {
    const order: PipelineStage[] = ["unassigned", "ta-review", "admin-review", "comms", "instructor", "approved"]
    return order.indexOf(getPipelineStage(status)) > order.indexOf(s)
  }
  const isActive = (s: PipelineStage) => {
    if (s === "ta-review" && (currentStage === "unassigned" || currentStage === "ta-review")) return true
    if (s === "admin-review" && (currentStage === "admin-review" || currentStage === "comms" || currentStage === "instructor")) return true
    if (s === "approved" && currentStage === "approved") return true
    return false
  }

  return (
    <div className="flex items-center gap-1 py-1">
      {stages.map((s, i) => {
        const done = isDone(s.stage)
        const active = isActive(s.stage)
        const state: "done" | "active" | "idle" = done ? "done" : active ? "active" : "idle"

        return (
          <div key={s.label} className="flex items-center gap-1">
            {i > 0 && <div className="h-px w-3 shrink-0 bg-[--border-subtle]" />}
            <PhasePill label={s.label} state={state} stage={s.stage} />
          </div>
        )
      })}
    </div>
  )
}

function PhasePill({ label, state, stage }: { label: string; state: "done" | "active" | "idle"; stage: PipelineStage }) {
  const styles = {
    done: "bg-green-500/15 text-green-400 border-green-500/20",
    active: `bg-[--stage-${stage}]/15 text-[--stage-${stage}] border-[--stage-${stage}]/30`,
    idle: "bg-[--surface-3] text-muted-foreground border-[--border-subtle]",
  }[state]

  const Icon = state === "done" ? CheckCircle2 : state === "active" ? Loader2 : Circle

  return (
    <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5", styles)}>
      <Icon className={cn("size-2.5 shrink-0", state === "active" && "animate-spin")} />
      <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
    </div>
  )
}

function getStatusLabel(status: CourseStatus): string {
  const labels: Record<CourseStatus, string> = {
    course_created: "Unassigned",
    assigned_to_ta: "Assigned",
    ta_review_in_progress: "Reviewing",
    submitted_to_admin: "Pending Admin",
    admin_changes_requested: "Fixes Needed",
    ready_for_instructor: "Ready for Instructor",
    sent_to_instructor: "Instructor Review",
    instructor_questions: "Questions",
    instructor_approved: "Awaiting Sign-off",
    final_approved: "Approved"
  }
  return labels[status] || status
}

function InfoChip({ label, subtle = true }: { label: string; subtle?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0 text-[10px] font-medium",
        subtle ? "text-muted-foreground border-[--border-subtle]" : "border-[--stage-ta-review]/30 bg-[--stage-ta-review]/10 text-[--stage-ta-review]"
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
      return "Migration — no TA assigned yet."
    case "assigned_to_ta":
      return "Migration — waiting for TA to begin."
    case "ta_review_in_progress":
      return "Migration — TA is actively reviewing."
    case "submitted_to_admin":
      return "Staging — awaiting admin review."
    case "admin_changes_requested":
      return "Staging — fixes sent back to TA."
    case "ready_for_instructor":
      return "Staging — ready to send to instructor."
    case "sent_to_instructor":
      return "Staging — instructor is reviewing."
    case "instructor_questions":
      return "Staging — instructor has questions."
    case "instructor_approved":
      return "Staging — awaiting admin final sign-off."
    case "final_approved":
      return "Provisioned."
    default:
      return "Staging."
  }
}
