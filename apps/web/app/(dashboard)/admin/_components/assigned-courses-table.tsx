"use client"
import { LottieLoader } from "@/components/ui/lottie-loader"

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
import { Search, SlidersHorizontal, CheckCircle2, Circle, Send } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { WORKFLOW_PHASES, getPipelineStage, COURSE_STATUS_LABELS } from "@coursebridge/workflow"
import type { CourseStatus, PipelineStage } from "@coursebridge/workflow"
import { batchApproveToStagingAction } from "../actions"
import { ReassignDialog, type ReassignTarget } from "./reassign-dialog"
import { OpenedDot } from "@/components/instructor/opened-dot"
import { toast } from "sonner"

type Props = {
  page: AdminCoursesPage
  tas: ProfileOption[]
  statusCounts: { status: CourseStatus; count: number }[]
  /**
   * Map of courseId -> first-opened timestamp for rows currently in the
   * instructor phase. Absent keys = not opened. Plain object so it crosses
   * the server/client boundary without serialization shenanigans.
   */
  instructorOpenedAt?: Record<string, string>
}

const INSTRUCTOR_PHASE_STATUSES = new Set<CourseStatus>([
  "sent_to_instructor",
  "instructor_viewing",
  "instructor_questions",
  "instructor_approved",
  "final_approved",
])

export function AssignedCoursesTable({ page, tas, statusCounts, instructorOpenedAt }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchPending, startBatchTransition] = useTransition()
  const [reassignTargets, setReassignTargets] = useState<ReassignTarget[]>([])
  const [reassignOpen, setReassignOpen] = useState(false)

  const search = searchParams.get("search") ?? ""
  const statusFilter = searchParams.get("status") ?? "all"
  const phaseParam = searchParams.get("phase")
  const taFilter = searchParams.get("ta") ?? "all"
  const currentPage = Math.max(page.page, 1)

  // A selected status chip implies its phase; otherwise honor the phase tab.
  // No param defaults to the Staging phase (matches the server); the All tab
  // sets an explicit ?phase=all.
  const activePhase: PipelineStage | "all" =
    statusFilter !== "all"
      ? getPipelineStage(statusFilter as CourseStatus)
      : phaseParam === "all"
        ? "all"
        : ((phaseParam as PipelineStage | null) ?? "staging")

  const countByStatus = useMemo(
    () => new Map(statusCounts.map((s) => [s.status, s.count])),
    [statusCounts]
  )
  const totalFilterCount = useMemo(
    () => statusCounts.reduce((n, s) => n + s.count, 0),
    [statusCounts]
  )
  const phaseStatuses = (key: PipelineStage) =>
    WORKFLOW_PHASES.find((p) => p.key === key)?.groups.flatMap((g) => g.statuses) ?? []
  const phaseCount = (key: PipelineStage) =>
    phaseStatuses(key).reduce((n, s) => n + (countByStatus.get(s) ?? 0), 0)

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
  const selectableIds = useMemo(
    () => filteredCourses.filter((c) => c.ta).map((c) => c.id),
    [filteredCourses]
  )

  const visibleTaCount = new Set(
    filteredCourses.map((course) => course.ta?.id).filter((value): value is string => Boolean(value))
  ).size

  // Summary boxes reflect ALL courses (global statusCounts), not just the current
  // page. phaseCount sums a phase's statuses from countByStatus; Staging includes
  // the instructor phase (incl. instructor_viewing) to match the prior grouping.
  const migration = phaseCount("migration")
  const staging = phaseCount("staging") + phaseCount("instructor")
  const needsAction = (countByStatus.get("submitted_to_admin") ?? 0) + (countByStatus.get("instructor_approved") ?? 0)
  const provision = phaseCount("provision")
  const pageStart = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1
  const pageEnd = page.total === 0 ? 0 : pageStart + filteredCourses.length - 1

  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelectableSelected ? new Set() : new Set(selectableIds))
  }

  const selectedRows = useMemo(
    () => page.data.filter((c) => selectedIds.has(c.id)),
    [page.data, selectedIds],
  )
  const approveEligibleSelectedCount = selectedRows.filter((r) => r.status === "submitted_to_admin").length

  const openReassign = (rows: AdminCourseRow[]) => {
    const targets = rows
      .filter((r) => r.ta) // only courses that currently have a TA can be reassigned
      .map((r) => ({ id: r.id, title: r.title }))
    if (targets.length === 0) {
      toast.error("Select at least one course that already has a TA.")
      return
    }
    setReassignTargets(targets)
    setReassignOpen(true)
  }

  function handleBatchApprove() {
    const ids = selectedRows.filter((r) => r.status === "submitted_to_admin").map((r) => r.id)
    if (ids.length === 0) {
      toast.warning("None of the selected courses are ready to move to staging.")
      return
    }
    startBatchTransition(async () => {
      const { succeeded, failed } = await batchApproveToStagingAction(ids)
      setSelectedIds(new Set())
      if (failed === 0) {
        toast.success(`${succeeded} course${succeeded !== 1 ? "s" : ""} moved to staging.`)
      } else {
        toast.warning(`${succeeded} moved, ${failed} failed.`)
      }
    })
  }

  function clearFilters() {
    setSearchInput("")
    setQuery({
      page: "1",
      search: null,
      status: null,
      ta: null,
    })
  }

  // Phase tabs write `phase` explicitly (including the "all" sentinel) so it
  // isn't dropped by setQuery's "all means clear" rule, and clear any status chip.
  function setPhase(key: PipelineStage | "all") {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", "1")
    params.delete("status")
    params.set("phase", key)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
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
    <Card className="min-w-0 max-w-full">
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
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative flex min-w-0 flex-1 items-center gap-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, IDs, term, department, TA name, or TA email..."
              className="pl-9 pr-3"
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
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <Select
              value={taFilter}
              onValueChange={(value) =>
                setQuery({
                  page: "1",
                  ta: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-full min-w-0 sm:w-[160px]">
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

        {/* Phase tabs + status-chip drill-down. Labels and grouping derive from
            WORKFLOW_PHASES / COURSE_STATUS_LABELS so they can never drift from
            the workflow definition. A phase tab filters by all its statuses; a
            chip narrows to one. */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPhase("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                activePhase === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              All
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  activePhase === "all" ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                )}
              >
                {totalFilterCount}
              </span>
            </button>
            {WORKFLOW_PHASES.map((p) => {
              const active = activePhase === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPhase(p.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {p.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {phaseCount(p.key)}
                  </span>
                </button>
              )
            })}
          </div>

          {activePhase !== "all" && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
              <span className="mr-0.5 text-xs font-medium text-muted-foreground">Status:</span>
              {phaseStatuses(activePhase).map((s) => {
                const active = statusFilter === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery({ page: "1", status: active ? null : s, phase: activePhase })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {COURSE_STATUS_LABELS[s]}
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {countByStatus.get(s) ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            {search
              ? <>Results for <span className="font-medium text-foreground">"{search}"</span></>
              : "Showing all courses"}
          </p>
          {isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <LottieLoader className="size-3 " />
              Searching…
            </span>
          ) : null}
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
          <>
          {/* Floating batch action bar */}
          {selectedIds.size > 0 && (
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 backdrop-blur">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {selectedIds.size} course{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => openReassign(selectedRows)}
                  disabled={isBatchPending}
                >
                  Reassign selected
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isBatchPending || approveEligibleSelectedCount === 0}
                  onClick={handleBatchApprove}
                >
                  <Send className="size-3" />
                  {isBatchPending ? "Moving…" : "Move to Staging"}
                </Button>
              </div>
            </div>
          )}

          <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">
                    {selectableIds.length > 0 && (
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all reassignable"
                      />
                    )}
                  </TableHead>
                  <TableHead className="text-xs">Course</TableHead>
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
                    <TableCell className="w-10 pl-4 align-middle" onClick={(e) => e.stopPropagation()}>
                      {course.ta && (
                        <Checkbox
                          checked={selectedIds.has(course.id)}
                          onCheckedChange={() => toggleRow(course.id)}
                          aria-label={`Select ${course.title}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[min(28rem,100%)] whitespace-normal break-words align-top">
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
                    <TableCell className="max-w-xs whitespace-normal break-words align-top sm:max-w-none">
                      {course.ta ? (
                        <div className="flex items-start gap-3 py-1">
                          <Avatar>
                            <AvatarFallback>{getInitials(course.ta.name ?? course.ta.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-foreground">{course.ta.name ?? "Unnamed TA"}</p>
                            <p className="truncate text-xs text-muted-foreground">{course.ta.email}</p>
                            <p className="text-[11px] text-muted-foreground">Current TA owner</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-2 mt-0.5 h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                openReassign([course])
                              }}
                            >
                              Reassign
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[10rem] max-w-md whitespace-normal align-top">
                      <WorkflowPipeline status={course.status} />
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal break-words align-top">
                      <div className="space-y-2 py-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={course.status} className="w-fit" />
                          {INSTRUCTOR_PHASE_STATUSES.has(course.status) && (
                            <OpenedDot openedAt={instructorOpenedAt?.[course.id] ?? null} size="sm" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{getStatusHint(course.status)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal pr-4 text-right align-top">
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
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs text-muted-foreground">
            {page.total === 0
              ? "No courses"
              : `Showing ${pageStart}–${pageEnd} of ${page.total.toLocaleString()} courses`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
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
            <span className="min-w-0 basis-full text-center text-xs text-muted-foreground sm:basis-auto sm:min-w-[5.5rem]">
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
      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        courses={reassignTargets}
        tas={tas}
        onDone={(ids) =>
          setSelectedIds((prev) => {
            const next = new Set(prev)
            ids.forEach((id) => next.delete(id))
            return next
          })
        }
      />
    </Card>
  )
}

type PhaseState = "done" | "active" | "idle"

const MIGRATION_DONE = new Set<CourseStatus>([
  "submitted_to_admin","admin_changes_requested",
  "waiting_on_admin","staging_in_progress",
  "ready_for_instructor","sent_to_instructor","instructor_questions","instructor_approved","final_approved"
])
const MIGRATION_ACTIVE = new Set<CourseStatus>(["assigned_to_ta", "ta_review_in_progress"])
const STAGING_DONE = new Set<CourseStatus>(["final_approved"])
const STAGING_ACTIVE = new Set<CourseStatus>([
  "submitted_to_admin","admin_changes_requested",
  "waiting_on_admin","staging_in_progress",
  "ready_for_instructor","sent_to_instructor","instructor_questions","instructor_approved"
])
const PROVISION_DONE = new Set<CourseStatus>(["final_approved"])

function phaseState(s: CourseStatus, done: Set<CourseStatus>, active: Set<CourseStatus>): PhaseState {
  return done.has(s) ? "done" : active.has(s) ? "active" : "idle"
}

function WorkflowPipeline({ status }: { status: CourseStatus }) {
  const phases: { label: string; state: PhaseState }[] = [
    { label: "Migration",  state: phaseState(status, MIGRATION_DONE, MIGRATION_ACTIVE) },
    { label: "Staging",    state: phaseState(status, STAGING_DONE, STAGING_ACTIVE) },
    { label: "Provision",  state: phaseState(status, PROVISION_DONE, new Set()) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 py-1">
      {phases.map((phase, i) => (
        <div key={phase.label} className="flex shrink-0 items-center gap-1">
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

  const Icon = state === "done" ? CheckCircle2 : state === "active" ? ActiveSpinner : Circle

  return (
    <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5", styles)}>
      <Icon className="size-2.5 shrink-0" />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  )
}

// Lightweight CSS spinner for the "active" phase. Replaces a full lottie-react
// player (647 KB JSON, looping rAF) that was rendered once per active phase per
// row — at 50 rows that meant dozens of simultaneous animation loops, which
// locked up the admin table on lower-powered machines (e.g. M1). currentColor
// keeps it tinted to the surrounding pill.
function ActiveSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block animate-spin rounded-full border-[1.5px] border-current border-t-transparent",
        className,
      )}
    />
  )
}

// A clickable phase stat-card: shows a phase's total course count and filters
// the table to that phase when clicked. The active card is highlighted with a
// primary ring + tint so the current filter is obvious at a glance.
function PhaseCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </button>
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
      return "Migration — no TA assigned yet."
    case "assigned_to_ta":
      return "Migration — waiting for TA to begin."
    case "ta_review_in_progress":
      return "Migration — TA is actively reviewing."
    case "submitted_to_admin":
      return "Staging — awaiting admin review."
    case "admin_changes_requested":
      return "Staging — fixes sent back to TA."
    case "waiting_on_admin":
      return "Staging — admin building the staging shell."
    case "staging_in_progress":
      return "Staging — TA finalizing the course."
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
