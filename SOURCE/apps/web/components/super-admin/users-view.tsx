"use client"

import { useActionState } from "react"
import { Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { PaginationControls } from "@/components/shared/pagination-controls"
import type { PaginatedResult } from "@/lib/repositories/contracts"
import type { UserRow } from "@/lib/super-admin/queries"
import { removeUserAccessAction } from "@/app/(dashboard)/super-admin/actions"

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

export function UsersView({ result, search, currentUserId }: { result: PaginatedResult<UserRow>, search: string, currentUserId: string }) {
  const { data: users, total, page, totalPages } = result
  const [removeState, removeFormAction, removePending] = useActionState(removeUserAccessAction, {
    kind: "idle",
    message: null,
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      <div className="flex flex-col flex-1 min-h-0">
        {removeState.kind !== "idle" && removeState.message && (
          <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${removeState.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
            {removeState.message}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="shrink-0 text-sm text-muted-foreground">{total} users</p>
          <form method="GET" action="/super-admin/users" className="relative min-w-0 w-full sm:w-64 sm:shrink-0">
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
                <TableHead className="text-xs text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="whitespace-normal break-words pl-4 text-sm font-medium">{u.full_name ?? "No name"}</TableCell>
                    <TableCell className="max-w-[14rem] whitespace-normal break-words text-xs text-muted-foreground sm:max-w-none">{u.email}</TableCell>
                    <TableCell className="whitespace-normal"><Badge variant="outline" className={`text-xs ${ROLE_BADGE_CLASS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">{fmt(u.created_at)}</TableCell>
                    <TableCell className="whitespace-normal pr-4 text-right">
                      <form
                        action={removeFormAction}
                        onSubmit={(event) => {
                          if (!window.confirm(`Remove ${u.email} from CourseBridge access?`)) {
                            event.preventDefault()
                          }
                        }}
                        className="inline-flex"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={removePending || u.id === currentUserId}
                          title={u.id === currentUserId ? "You cannot remove your own profile" : "Remove user"}
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </Button>
                      </form>
                    </TableCell>
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
