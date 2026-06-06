import Link from "next/link"
import { BookOpen, Building2, Folder, FolderTree, GraduationCap, Users } from "lucide-react"
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
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/courses/status-badge"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { OrgBreadcrumb } from "@/components/hierarchy/org-breadcrumb"
import { OrgCourseFilters } from "@/components/hierarchy/org-course-filters"
import { cn } from "@/lib/utils"

function UnitTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "college") return <Building2 className={className} />
  if (type === "faculty" || type === "school") return <GraduationCap className={className} />
  return <Folder className={className} />
}

function countBy(statusCounts: StatusCount[], status: string) {
  return statusCounts.find((c) => c.status === status)?.count ?? 0
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
  const childLabel = current ? "Sub-units" : "Colleges"

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <OrgBreadcrumb crumbs={breadcrumb} />

      {current && (
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted p-2 text-foreground/70">
            <UnitTypeIcon type={current.type} className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold leading-tight">{current.name}</h2>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{current.type}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Courses" value={courseTotal} icon="book-open" index={0} />
        <StatCard label="In progress" value={inProgress} icon="clock" index={1} />
        <StatCard label="Approved" value={approved} icon="check-square" index={2} />
        <StatCard
          label="Needs attention"
          value={needsAttention}
          icon="alert-triangle"
          index={3}
          accent={needsAttention > 0 ? "#ef4444" : "#10b981"}
        />
      </div>

      {/* Sub-units / Colleges */}
      {children.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderTree className="size-3.5" /> {childLabel}{" "}
            <span className="font-normal normal-case">({children.length})</span>
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children.map((c) => (
              <SubUnitCard key={c.id} child={c} />
            ))}
          </div>
        </section>
      )}

      {/* Leadership */}
      {current && (
        <section>
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
  return (
    <Link
      href={`/hierarchy?unit=${child.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="mt-0.5 rounded-md bg-muted p-2 text-foreground/70">
            <UnitTypeIcon type={child.type} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium group-hover:text-primary">{child.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{child.type}</p>
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
    <section className="flex min-w-0 flex-col">
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
