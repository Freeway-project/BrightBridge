import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Building2, Folder, FolderTree, GraduationCap, Users } from "lucide-react"
import type { AdminCourseRow, PaginatedResult, StatusCount } from "@/lib/repositories/contracts"
import type { OrgChild, OrgExplorerView } from "@/lib/hierarchy/explorer-queries"
import { roleTitleStyle } from "@/lib/super-admin/roles"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/courses/status-badge"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { OrgBreadcrumb } from "@/components/hierarchy/org-breadcrumb"
import { OrgCourseFilters } from "@/components/hierarchy/org-course-filters"
import { HierarchyIntro } from "@/components/hierarchy/hierarchy-intro"
import { cn } from "@/lib/utils"

function UnitTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "college") return <Building2 className={className} />
  if (type === "faculty" || type === "school") return <GraduationCap className={className} />
  return <Folder className={className} />
}

// Per-unit-type accent (left border + icon tint) so colleges / schools /
// departments are visually distinct at a glance.
const UNIT_TYPE_STYLES: Record<string, { border: string; iconBg: string }> = {
  college:    { border: "border-l-blue-500",    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  faculty:    { border: "border-l-violet-500",  iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  school:     { border: "border-l-violet-500",  iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  department: { border: "border-l-emerald-500", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
}
const DEFAULT_UNIT_STYLE = { border: "border-l-slate-400", iconBg: "bg-slate-400/10 text-slate-600 dark:text-slate-300" }
function unitTypeStyle(type: string) {
  return UNIT_TYPE_STYLES[type] ?? DEFAULT_UNIT_STYLE
}

// Friendly singular/plural names so the UI reads "Department" (not "department")
// and section headings adapt to what's underneath (Colleges → Schools → Departments).
const UNIT_TYPE_LABELS: Record<string, { one: string; many: string }> = {
  college:    { one: "College",    many: "Colleges" },
  faculty:    { one: "Faculty",    many: "Faculties" },
  school:     { one: "School",     many: "Schools" },
  department: { one: "Department", many: "Departments" },
}
function typeLabel(type: string, plural = false): string {
  const l = UNIT_TYPE_LABELS[type]
  if (l) return plural ? l.many : l.one
  const cap = type.charAt(0).toUpperCase() + type.slice(1)
  return plural ? `${cap}s` : cap
}

function countBy(statusCounts: StatusCount[], status: string) {
  return statusCounts.find((c) => c.status === status)?.count ?? 0
}

// Wraps a KPI card with a plain-language tooltip — inline help for non-technical users.
function Kpi({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{children}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[14rem] text-center">{tip}</TooltipContent>
    </Tooltip>
  )
}

export function OrgExplorer({
  view,
  courses,
  filters,
}: {
  view: OrgExplorerView
  courses: PaginatedResult<AdminCourseRow> | null
  filters: { search: string; status: string; term: string }
}) {
  const { current, breadcrumb, children, leadership, statusCounts, courseTotal, terms } = view
  const approved = countBy(statusCounts, "final_approved")
  const needsAttention =
    countBy(statusCounts, "admin_changes_requested") + countBy(statusCounts, "instructor_questions")
  const inProgress = Math.max(0, courseTotal - approved)
  // Name the children section after what's actually in it (all Schools, all
  // Departments, …); fall back to "Sub-units" when it's a mix.
  const childTypes = new Set(children.map((c) => c.type))
  const childLabel =
    childTypes.size === 1 ? typeLabel(children[0].type, true) : current ? "Sub-units" : "Units"

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <HierarchyIntro />

      <div data-tour="breadcrumb">
        <OrgBreadcrumb crumbs={breadcrumb} />
      </div>

      {current && (
        <div className="flex items-center gap-2">
          <span className={cn("rounded-md p-2", unitTypeStyle(current.type).iconBg)}>
            <UnitTypeIcon type={current.type} className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold leading-tight">{current.name}</h2>
            <p className="text-xs font-medium text-muted-foreground">{typeLabel(current.type)}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <TooltipProvider delayDuration={150}>
        <div data-tour="kpis" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi tip="Total courses in this unit and everything beneath it.">
            <StatCard label="Courses" value={courseTotal} icon="book-open" index={0} />
          </Kpi>
          <Kpi tip="Courses still being worked on — not yet final-approved.">
            <StatCard label="In progress" value={inProgress} icon="clock" index={1} />
          </Kpi>
          <Kpi tip="Courses that have reached Final Approved.">
            <StatCard label="Approved" value={approved} icon="check-square" index={2} />
          </Kpi>
          <Kpi tip="Courses where someone is waiting on a fix or a question — worth a look.">
            <StatCard
              label="Needs attention"
              value={needsAttention}
              icon="alert-triangle"
              index={3}
              accent={needsAttention > 0 ? "#ef4444" : "#10b981"}
            />
          </Kpi>
        </div>
      </TooltipProvider>

      {/* Sub-units / Colleges */}
      {children.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderTree className="size-3.5" /> {childLabel}{" "}
            <span className="font-normal normal-case">({children.length})</span>
          </h3>
          <div
            data-tour="subunits"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {children.map((c) => (
              <SubUnitCard key={c.id} child={c} />
            ))}
          </div>
        </section>
      )}

      {/* Leadership */}
      {current && (
        <section data-tour="leadership">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> Leadership
          </h3>
          {leadership.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leadership assigned to this unit.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {leadership.map((m) => {
                const s = roleTitleStyle(m.rawTitle)
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5"
                  >
                    <span className={cn("size-2.5 rounded-full", s.dot)} />
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", s.chip)}>
                      {m.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Courses */}
      {current && courses && (
        <CoursesSection courses={courses} courseTotal={courseTotal} filters={filters} terms={terms} />
      )}

      {!current && children.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No organizational units yet. Seed the hierarchy to populate this view.
        </p>
      )}
    </div>
  )
}

function SubUnitCard({ child }: { child: OrgChild }) {
  const s = unitTypeStyle(child.type)
  return (
    <Link
      href={`/hierarchy?unit=${child.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          "h-full border-l-4 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md",
          s.border,
        )}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <span className={cn("mt-0.5 shrink-0 rounded-md p-2", s.iconBg)}>
            <UnitTypeIcon type={child.type} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium group-hover:text-primary">{child.name}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{typeLabel(child.type)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" />
                {child.courseCount} course{child.courseCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {child.memberCount} staff
              </span>
            </div>
          </div>
          {/* "Click me" affordance */}
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
            Open
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

function CoursesSection({
  courses,
  courseTotal,
  filters,
  terms,
}: {
  courses: PaginatedResult<AdminCourseRow>
  courseTotal: number
  filters: { search: string; status: string; term: string }
  terms: string[]
}) {
  const filteredCount = courses.total
  const countLabel =
    filteredCount !== courseTotal ? `${filteredCount} of ${courseTotal}` : `${courseTotal}`

  return (
    <section data-tour="courses" className="flex min-w-0 flex-col">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Courses <span className="font-normal normal-case">({countLabel})</span>
        </h3>
        <OrgCourseFilters
          search={filters.search}
          status={filters.status}
          term={filters.term}
          terms={terms}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead scope="col" className="pl-4 text-xs">Code</TableHead>
              <TableHead scope="col" className="text-xs">Title</TableHead>
              <TableHead scope="col" className="w-[190px] text-xs">Status</TableHead>
              <TableHead scope="col" className="hidden text-xs sm:table-cell">Term</TableHead>
              <TableHead scope="col" className="hidden text-xs md:table-cell">Department</TableHead>
              <TableHead scope="col" className="text-xs">Staff (TA)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No courses match these filters.
                </TableCell>
              </TableRow>
            ) : (
              courses.data.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                    {c.sourceCourseId ?? c.targetCourseId ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[22rem] whitespace-normal break-words text-sm font-medium">
                    {c.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{c.term ?? "—"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{c.department ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.ta?.name ?? c.ta?.email ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls page={courses.page} totalPages={courses.totalPages} totalItems={courses.total} />
    </section>
  )
}
