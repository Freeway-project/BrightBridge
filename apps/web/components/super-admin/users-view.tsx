"use client"

import { useActionState } from "react"
import { ShieldPlus, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ROLES } from "@coursebridge/workflow"
import { createUserAction } from "@/app/(dashboard)/super-admin/actions"
import { PaginationControls } from "@/components/shared/pagination-controls"
import type { PaginatedResult } from "@/lib/repositories/contracts"
import type { UserRow } from "@/lib/super-admin/queries"

const initialManageUserState = {
  kind: "idle" as const,
  message: null,
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  standard_user: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  admin_full:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  admin_viewer:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  instructor:     "bg-green-500/15 text-green-400 border-green-500/20",
  super_admin:    "bg-red-500/15 text-red-400 border-red-500/20",
}

const ROLE_LABELS: Record<string, string> = {
  standard_user: "Staff",
  admin_full: "Admin",
  admin_viewer: "Viewer",
  instructor: "Instructor",
  super_admin: "Super Admin",
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function UsersView({ result, search }: { result: PaginatedResult<UserRow>, search: string }) {
  const { data: users, total, page, totalPages } = result
  const [createState, createFormAction, createPending] = useActionState(createUserAction, initialManageUserState)

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-background">
      <Card className="shrink-0">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><ShieldPlus className="size-4" /> Create User</CardTitle></CardHeader>
        <CardContent>
          <form action={createFormAction} className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
            <Input name="fullName" placeholder="Full name" required />
            <Input name="email" placeholder="Email" required type="email" />
            <Input name="password" placeholder="Password" required type="password" />
            <Select name="role" defaultValue="standard_user">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={createPending}>{createPending ? "Creating..." : "Create User"}</Button>
          </form>
          {createState.message && <p className={`mt-2 text-sm ${createState.kind === "error" ? "text-destructive" : "text-green-600"}`}>{createState.message}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{total} users</p>
          <form method="GET" action="/super-admin/users" className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search by name, email, role…"
              className="pl-8 h-8 text-sm"
              defaultValue={search}
            />
          </form>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs pl-4">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="pl-4 text-sm font-medium">{u.full_name ?? "No name"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${ROLE_BADGE_CLASS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(u.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} totalItems={total} />
      </div>
    </div>
  )
}
