"use client"

import Link from "next/link"
import { useActionState, useEffect, useMemo, useState, useTransition } from "react"
import {
  ArrowRight,
  BookOpen,
  Building,
  Building2,
  Folder,
  FolderTree,
  GraduationCap,
  Search,
  Users,
} from "lucide-react"
import type { AdminCourseRow, PaginatedResult, StatusCount } from "@/lib/repositories/contracts"
import type {
  OrgChild,
  OrgExplorerView,
  OrgUnitMemberDetail,
  OrgUserOption,
} from "@/lib/hierarchy/explorer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { roleTitleStyle, ROLE_TITLE_LABELS } from "@/lib/super-admin/roles"
import {
  addUnitMemberAction,
  removeUnitMemberAction,
  type ManageUserState,
} from "@/app/(dashboard)/super-admin/actions"

type Filters = {
  search: string
  status: string
  term: string
}

type Props = {
  view: OrgExplorerView
  courses: PaginatedResult<AdminCourseRow> | null
  filters: Filters
  role: string
}

const initialState: ManageUserState = { kind: "idle", message: null }

const UNIT_TYPE_STYLES: Record<string, { border: string; iconBg: string }> = {
  college: { border: "border-l-blue-500", iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  faculty: { border: "border-l-violet-500", iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  school: { border: "border-l-violet-500", iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  department: { border: "border-l-emerald-500", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
}
const DEFAULT_UNIT_STYLE = { border: "border-l-slate-400", iconBg: "bg-slate-400/10 text-slate-600 dark:text-slate-300" }

function unitTypeStyle(type: string) {
  return UNIT_TYPE_STYLES[type] ?? DEFAULT_UNIT_STYLE
}

function UnitTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "college") return <Building2 className={className} />
  if (type === "faculty" || type === "school") return <GraduationCap className={className} />
  if (type === "department") return <Building className={className} />
  return <Folder className={className} />
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function buildHierarchyHref(unitId: string | null, filters: Filters) {
  const params = new URLSearchParams()
  if (unitId) params.set("unit", unitId)
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.term) params.set("term", filters.term)
  const query = params.toString()
  return query ? `/hierarchy?${query}` : "/hierarchy"
}

function countBy(statusCounts: StatusCount[], status: string) {
  return statusCounts.find((c) => c.status === status)?.count ?? 0
}

export function OrgExplorer({ view, courses, filters, role: _role }: Props) {
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [memberState, memberFormAction, memberPending] = useActionState(addUnitMemberAction, initialState)

  useEffect(() => {
    if (memberState.kind === "success") setAddMemberOpen(false)
  }, [memberState.kind])

  const approved = countBy(view.statusCounts, "final_approved")
  const needsAttention =
    countBy(view.statusCounts, "admin_changes_requested") + countBy(view.statusCounts, "instructor_questions")
  const inProgress = Math.max(0, view.courseTotal - approved)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <OrgBreadcrumb crumbs={view.breadcrumb} filters={filters} />
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              {view.current ? view.current.name : "Institution overview"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {view.current
                ? `${typeLabel(view.current.type)} — open a sub-unit to drill in, or scroll to see its courses.`
                : "Select a college or department to drill in and see its courses."}
            </p>
          </div>
        </div>
        {view.canManage && view.current && (
          <Button variant="outline" onClick={() => setAddMemberOpen(true)}>
            <Users className="mr-2 size-4" /> Add member
          </Button>
        )}
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Courses" value={view.courseTotal} icon="book-open" index={0} />
        <StatCard label="In progress" value={inProgress} icon="clock" index={1} />
        <StatCard label="Approved" value={approved} icon="check-square" index={2} />
        <StatCard label="Needs attention" value={needsAttention} icon="alert-triangle" index={3} accent={needsAttention > 0 ? "#ef4444" : "#10b981"} />
      </div>

      {/* Child unit navigation — click to drill down */}
      {view.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="size-4 text-primary" />
              {view.current ? `${typeLabel(view.current.type)} units` : "Colleges & Schools"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Open a unit to see its departments and courses.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {view.children.map((child) => (
                <SubUnitCard key={child.id} child={child} filters={filters} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses — always visible when a unit is selected */}
      {view.current && courses && (
        <CoursesSection
          courses={courses}
          courseTotal={view.courseTotal}
          filters={filters}
          terms={view.terms}
        />
      )}

      {/* Leadership */}
      {view.leadership.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" /> Leadership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.leadership.map((member) => {
              const style = roleTitleStyle(member.rawTitle)
              return (
                <div key={member.id} className="rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <span className={cn("rounded border px-2 py-0.5 text-[10px] font-medium", style.chip)}>
                      {member.title}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Manage — super_admin only */}
      {view.canManage && view.current && (
        <ManageSection
          currentName={view.current.name}
          members={view.selectedMembers}
          onAddMember={() => setAddMemberOpen(true)}
          onRemoveMember={(memberId) => {
            setRemovingMemberId(memberId)
            startTransition(async () => {
              try {
                await removeUnitMemberAction(memberId)
              } finally {
                setRemovingMemberId(null)
              }
            })
          }}
          removingMemberId={removingMemberId}
        />
      )}

      {view.canManage && view.current ? (
        <AddMemberSheet
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          unitId={view.current.id}
          unitName={view.current.name}
          users={view.userOptions}
          formAction={memberFormAction}
          pending={memberPending}
          state={memberState}
        />
      ) : null}
    </div>
  )
}


function SubUnitCard({ child, filters }: { child: OrgChild; filters: Filters }) {
  const style = unitTypeStyle(child.type)
  return (
    <Link
      href={buildHierarchyHref(child.id, filters)}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className={cn("h-full border-l-4 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md", style.border)}>
        <CardContent className="flex items-start gap-3 p-4">
          <span className={cn("mt-0.5 shrink-0 rounded-md p-2", style.iconBg)}>
            <UnitTypeIcon type={child.type} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium group-hover:text-primary">{child.name}</p>
            <p className="text-[11px] text-muted-foreground">{typeLabel(child.type)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><BookOpen className="size-3" /> {child.courseCount} courses</span>
              <span className="inline-flex items-center gap-1"><Users className="size-3" /> {child.memberCount} staff</span>
            </div>
          </div>
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
            Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
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
  courses: PaginatedResult<AdminCourseRow> | null
  courseTotal: number
  filters: Filters
  terms: string[]
}) {
  if (!courses) return null

  const filteredCount = courses.total
  const countLabel = filteredCount !== courseTotal ? `${filteredCount} of ${courseTotal}` : `${courseTotal}`

  return (
    <Card>
      <CardHeader className="gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Courses</CardTitle>
          <p className="text-sm text-muted-foreground">{countLabel} course records in this subtree.</p>
        </div>
        <OrgCourseFilters search={filters.search} status={filters.status} term={filters.term} terms={terms} />
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs">Code</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Term</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Department</TableHead>
                <TableHead className="text-xs">Instructor</TableHead>
                <TableHead className="text-xs">Staff (TA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No courses match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                courses.data.map((course) => (
                  <TableRow key={course.id} className="border-border">
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {course.sourceCourseId ?? course.targetCourseId ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[22rem] whitespace-normal break-words text-sm font-medium">
                      {course.title}
                    </TableCell>
                    <TableCell><StatusBadge status={course.status} /></TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{course.term ?? "-"}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{course.department ?? "-"}</TableCell>
                    <TableCell className="text-xs">{course.instructor?.name ?? course.instructor?.email ?? "-"}</TableCell>
                    <TableCell className="text-xs">{course.ta?.name ?? course.ta?.email ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 pb-6">
          <PaginationControls page={courses.page} totalPages={courses.totalPages} totalItems={courses.total} />
        </div>
      </CardContent>
    </Card>
  )
}

function ManageSection({
  currentName,
  members,
  onAddMember,
  onRemoveMember,
  removingMemberId,
}: {
  currentName: string
  members: OrgUnitMemberDetail[]
  onAddMember: () => void
  onRemoveMember: (memberId: string) => void
  removingMemberId: string | null
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Manage {currentName}</CardTitle>
            <p className="text-sm text-muted-foreground">Add staff and adjust leadership assignments for this unit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onAddMember}>
              <Users className="mr-2 size-4" /> Add member
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current assignments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs">Member</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Primary</TableHead>
                <TableHead className="pr-6 text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No assignments yet. Add the first member for this unit.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="border-border">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {ROLE_TITLE_LABELS[member.title] ?? member.title}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{member.isPrimary ? "Primary" : "Secondary"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removingMemberId === member.id}
                        onClick={() => onRemoveMember(member.id)}
                      >
                        {removingMemberId === member.id ? "Removing..." : "Remove"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AddMemberSheet({
  open,
  onOpenChange,
  unitId,
  unitName,
  users,
  formAction,
  pending,
  state,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitId: string
  unitName: string
  users: OrgUserOption[]
  formAction: (payload: FormData) => void
  pending: boolean
  state: ManageUserState
}) {
  const [search, setSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [title, setTitle] = useState("dept_head")

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelectedUserId("")
      setTitle("dept_head")
    }
  }, [open])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users.slice(0, 100)
    return users
      .filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .slice(0, 100)
  }, [search, users])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[440px] max-w-[440px] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>Add member to {unitName}</SheetTitle>
          <SheetDescription className="sr-only">Search for a user to add as a member to this unit</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <input type="hidden" name="orgUnitId" value={unitId} />
          <input type="hidden" name="profileId" value={selectedUserId} />
          <input type="hidden" name="title" value={title} />

          <div className="space-y-3 border-b border-border p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Search user</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-8" placeholder="Name or email" autoFocus />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title</label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dean">Dean</SelectItem>
                  <SelectItem value="assistant_dean">Asst. Dean</SelectItem>
                  <SelectItem value="dept_head">Dept Head</SelectItem>
                  <SelectItem value="educator">Educator / Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No users found.</p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedUserId === user.id && "border-l-2 border-primary bg-primary/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                    {selectedUserId === user.id ? <Badge>Selected</Badge> : null}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="space-y-3 border-t border-border p-4">
            {state.kind === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
            <Button type="submit" disabled={pending || !selectedUserId} className="w-full">
              {pending ? "Assigning..." : selectedUserId ? "Assign member" : "Select a user first"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
