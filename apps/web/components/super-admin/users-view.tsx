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
import { cn } from "@/lib/utils"
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
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <Card className="shrink-0 border-border/60 shadow-md">
        <CardHeader className="pb-3"><CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><ShieldPlus className="size-3.5 text-primary" /> Create New User</CardTitle></CardHeader>
        <CardContent>
          <form action={createFormAction} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
            <Input name="fullName" placeholder="Full name" required className="h-9 text-sm" />
            <Input name="email" placeholder="Email" required type="email" className="h-9 text-sm" />
            <Input name="password" placeholder="Password" required type="password" className="h-9 text-sm" />
            <Select name="role" defaultValue="standard_user">
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="vibrant" className="w-full md:col-span-2 lg:col-span-1 h-9 font-bold" disabled={createPending}>{createPending ? "Creating..." : "Create User"}</Button>
          </form>
          {createState.message && <p className={`mt-2 text-[11px] font-semibold ${createState.kind === "error" ? "text-destructive" : "text-success"}`}>{createState.message}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-sm font-semibold text-foreground">{total} total users</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">STAFF LIST</span>
          </div>
          <form method="GET" action="/super-admin/users" className="relative min-w-0 w-full sm:w-64 sm:shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search users..."
              className="pl-8 h-8 text-sm rounded-full"
              defaultValue={search}
            />
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex-1 flex flex-col">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border bg-muted/30">
                <TableHead className="text-[11px] uppercase tracking-wider font-bold pl-6">Member Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-bold">Email Address</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-bold w-[140px]">Access Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-bold w-[120px] text-right pr-6">Joined Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground italic">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u, idx) => {
                  const bgClass = idx % 2 === 0 ? "bg-card" : "bg-secondary/50"
                  return (
                    <TableRow key={u.id} className={cn("group border-b border-border border-l-[3px] border-l-muted-foreground/20 transition-colors hover:bg-primary/5", bgClass)}>
                      <TableCell className="whitespace-normal break-words pl-5 py-4 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{u.full_name ?? "No name"}</TableCell>
                      <TableCell className="max-w-[14rem] whitespace-normal break-words text-[11px] font-semibold text-muted-foreground/80 sm:max-w-none">{u.email}</TableCell>
                      <TableCell className="whitespace-normal">
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider px-2 rounded-full", ROLE_BADGE_CLASS[u.role])}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-[11px] text-right pr-6 font-bold text-muted-foreground/70">{fmt(u.created_at)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} totalItems={total} />
      </div>
    </div>
  )
}
