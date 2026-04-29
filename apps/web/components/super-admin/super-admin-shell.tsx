"use client"

import { useActionState, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/courses/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle, Search, ShieldPlus, UserCog,
} from "lucide-react"
import { COURSE_STATUS_LABELS, ROLES, type CourseStatus, type Role } from "@coursebridge/workflow"
import type { SuperAdminData } from "@/lib/super-admin/queries"
import {
  createUserAction,
  updateUserRoleAction,
} from "@/app/(dashboard)/super-admin/actions"

const initialManageUserState = {
  kind: "idle" as const,
  message: null,
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  ta:             "bg-blue-500/15 text-blue-400 border-blue-500/20",
  admin:          "bg-purple-500/15 text-purple-400 border-purple-500/20",
  communications: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  instructor:     "bg-green-500/15 text-green-400 border-green-500/20",
  super_admin:    "bg-red-500/15 text-red-400 border-red-500/20",
}

const ROLE_LABELS: Record<string, string> = {
  ta: "TA", admin: "Admin", communications: "Comm Dept",
  instructor: "Instructor", super_admin: "Super Admin",
}

const STATUS_ORDER: CourseStatus[] = [
  "course_created", "assigned_to_ta", "ta_review_in_progress",
  "submitted_to_admin", "admin_changes_requested", "ready_for_instructor",
  "sent_to_instructor", "instructor_questions", "instructor_approved", "final_approved",
]

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

interface Props {
  data: SuperAdminData
}

export function SuperAdminShell({ data }: Props) {
  const { courses, users, statusCounts, stuckCourses, taWorkload, auditEvents } = data
  const [courseSearch, setCourseSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [newUserRole, setNewUserRole] = useState<Role>("ta")
  const [createState, createFormAction, createPending] = useActionState(
    createUserAction,
    initialManageUserState,
  )

  // Stats
  const totalCourses = courses.length
  const inProgress  = courses.filter((c) => c.status === "ta_review_in_progress").length
  const pendingAdmin = courses.filter((c) =>
    c.status === "submitted_to_admin" || c.status === "admin_changes_requested"
  ).length
  const withInstructor = courses.filter((c) =>
    c.status === "sent_to_instructor" || c.status === "instructor_questions"
  ).length
  const completed = courses.filter((c) => c.status === "final_approved").length

  // Status distribution (align to canonical order)
  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]))
  const maxCount = Math.max(...statusCounts.map((s) => s.count), 1)

  // Filtered tables
  const filteredCourses = courses.filter(
    (c) =>
      courseSearch.trim() === "" ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.status.toLowerCase().includes(courseSearch.toLowerCase()) ||
      (c.ta?.name ?? "").toLowerCase().includes(courseSearch.toLowerCase())
  )
  const filteredUsers = users.filter(
    (u) =>
      userSearch.trim() === "" ||
      (u.full_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border px-6 pt-2">
        <TabsList className="h-9 bg-transparent p-0 gap-1">
          {["overview", "courses", "users", "audit"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 text-sm capitalize data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tab === "audit" ? "Audit Trail" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* ─── Overview ─────────────────────────────────────────────────────── */}
      <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Total Courses"    value={totalCourses}    icon="book-open" />
          <StatCard label="TA In Progress"   value={inProgress}      icon="clock" />
          <StatCard label="Pending Admin"    value={pendingAdmin}    icon="check-square" />
          <StatCard label="With Instructor"  value={withInstructor}  icon="book-open" />
          <StatCard label="Completed"        value={completed}       icon="check-square" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Courses by Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {STATUS_ORDER.map((status) => {
                const count = countByStatus[status] ?? 0
                if (count === 0) return null
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{COURSE_STATUS_LABELS[status]}</span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                    <Progress value={(count / maxCount) * 100} className="h-1.5" />
                  </div>
                )
              })}
              {statusCounts.length === 0 && (
                <p className="text-xs text-muted-foreground">No courses yet.</p>
              )}
            </CardContent>
          </Card>

          {/* TA Workload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">TA Workload</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-xs pl-6">TA</TableHead>
                    <TableHead className="text-xs text-center">Active</TableHead>
                    <TableHead className="text-xs text-center">Needs Fixes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taWorkload.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground pl-6 py-4">
                        No TAs assigned.
                      </TableCell>
                    </TableRow>
                  ) : (
                    taWorkload.map((ta) => (
                      <TableRow key={ta.id} className="border-border">
                        <TableCell className="pl-6">
                          <p className="text-sm font-medium">{ta.full_name ?? ta.email}</p>
                          {ta.full_name && <p className="text-xs text-muted-foreground">{ta.email}</p>}
                        </TableCell>
                        <TableCell className="text-center text-sm">{ta.active_courses}</TableCell>
                        <TableCell className="text-center">
                          {ta.needs_fixes > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="size-3" />{ta.needs_fixes}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Stuck courses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Stuck Courses
              <span className="text-xs font-normal text-muted-foreground">(no status change in &gt;5 days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stuckCourses.length === 0 ? (
              <p className="px-6 pb-4 text-xs text-muted-foreground">No stuck courses.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-xs pl-6">Course</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Last Updated</TableHead>
                    <TableHead className="text-xs text-right pr-6">Days Stuck</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stuckCourses.map((c) => (
                    <TableRow key={c.id} className="border-border">
                      <TableCell className="pl-6 text-sm font-medium">{c.title}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(c.updated_at)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <span className={`text-sm font-semibold ${c.days_stuck >= 10 ? "text-destructive" : "text-orange-400"}`}>
                          {c.days_stuck}d
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── All Courses ──────────────────────────────────────────────────── */}
      <TabsContent value="courses" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filteredCourses.length} courses</p>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by title, status, TA…"
              className="pl-8 h-8 text-sm"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs pl-4">Title</TableHead>
                <TableHead className="text-xs w-[100px]">Term</TableHead>
                <TableHead className="text-xs w-[200px]">Status</TableHead>
                <TableHead className="text-xs">TA</TableHead>
                <TableHead className="text-xs">Instructor</TableHead>
                <TableHead className="text-xs w-[110px]">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No courses match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="pl-4 text-sm font-medium max-w-[220px] truncate">{c.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.term ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-xs">{c.ta?.name ?? c.ta?.email ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs">{c.instructor?.name ?? c.instructor?.email ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(c.updated_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ─── All Users ────────────────────────────────────────────────────── */}
      <TabsContent value="users" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldPlus className="size-4" />
              Create User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFormAction} className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
              <label className="grid gap-1.5 text-sm font-medium">
                Full name
                <Input name="fullName" placeholder="Jane Doe" required />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <Input name="email" placeholder="jane@institution.edu" required type="email" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Password
                <Input name="password" required type="password" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Role
                <input name="role" type="hidden" value={newUserRole} />
                <Select onValueChange={(value) => setNewUserRole(value as Role)} value={newUserRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role] ?? role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="flex items-end">
                <Button disabled={createPending} type="submit">
                  {createPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
            {createState.message ? (
              <p className={createState.kind === "error" ? "mt-3 text-sm text-destructive" : "mt-3 text-sm text-green-600"}>
                {createState.message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filteredUsers.length} users</p>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, role…"
              className="pl-8 h-8 text-sm"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs pl-4">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs w-[140px]">Role</TableHead>
                <TableHead className="text-xs w-[180px]">Manage</TableHead>
                <TableHead className="text-xs w-[120px]">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="pl-4 text-sm font-medium">{u.full_name ?? <span className="text-muted-foreground italic">No name</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-medium ${ROLE_BADGE_CLASS[u.role]}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RoleUpdateForm userId={u.id} currentRole={u.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(u.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ─── Audit Trail ──────────────────────────────────────────────────── */}
      <TabsContent value="audit" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
        <p className="text-sm text-muted-foreground">Last 100 status transitions across all courses.</p>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs pl-4">Course</TableHead>
                <TableHead className="text-xs">Transition</TableHead>
                <TableHead className="text-xs">Actor</TableHead>
                <TableHead className="text-xs w-[100px]">Role</TableHead>
                <TableHead className="text-xs w-[130px]">Note</TableHead>
                <TableHead className="text-xs w-[130px]">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No transitions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                auditEvents.map((e) => (
                  <TableRow key={e.id} className="border-border">
                    <TableCell className="pl-4 text-sm font-medium max-w-[180px] truncate">{e.course_title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{e.from_status ? COURSE_STATUS_LABELS[e.from_status as CourseStatus] : "Created"}</span>
                        <span className="text-muted-foreground">→</span>
                        <StatusBadge status={e.to_status as CourseStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{e.actor_name ?? e.actor_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-medium ${ROLE_BADGE_CLASS[e.actor_role]}`}>
                        {ROLE_LABELS[e.actor_role] ?? e.actor_role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[130px] truncate">
                      {e.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(e.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function RoleUpdateForm({ userId, currentRole }: { userId: string; currentRole: Role }) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole)
  const [state, formAction, pending] = useActionState(
    updateUserRoleAction,
    initialManageUserState,
  )

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input name="userId" type="hidden" value={userId} />
      <input name="role" type="hidden" value={selectedRole} />
      <Select onValueChange={(value) => setSelectedRole(value as Role)} value={selectedRole}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role] ?? role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" type="submit" variant="outline">
        <UserCog className="size-3.5" />
        {pending ? "Saving..." : "Save"}
      </Button>
      {state.kind === "error" ? <span className="text-[11px] text-destructive">{state.message}</span> : null}
      {state.kind === "success" ? <span className="text-[11px] text-green-600">Updated</span> : null}
    </form>
  )
}
