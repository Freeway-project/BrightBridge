"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldPlus, KeyRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchBar } from "@/components/ui/search-bar"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ROLES } from "@coursebridge/workflow"
import { createUserAction, resetUserPasswordAction } from "@/app/(dashboard)/super-admin/actions"
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
  provost:        "bg-orange-500/15 text-orange-400 border-orange-500/20",
}

const ROLE_LABELS: Record<string, string> = {
  standard_user: "Staff",
  admin_full: "Admin",
  admin_viewer: "Viewer",
  instructor: "Instructor",
  super_admin: "Super Admin",
  provost: "Provost",
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type SelectedUser = { id: string; email: string; fullName: string | null }

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: SelectedUser
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState(resetUserPasswordAction, initialManageUserState)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="size-4" /> Reset Password
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{user.fullName ?? user.email}</p>
        <p className="text-xs text-muted-foreground -mt-2">{user.email}</p>
        <form action={formAction} className="flex flex-col gap-3 mt-1">
          <input type="hidden" name="userId" value={user.id} />
          <Input
            name="password"
            type="password"
            placeholder="New password (min 8 chars)"
            required
            minLength={8}
            autoFocus
          />
          {state.message && (
            <p className={`text-xs ${state.kind === "error" ? "text-destructive" : "text-green-500"}`}>
              {state.message}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Set Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersView({ result, search }: { result: PaginatedResult<UserRow>, search: string }) {
  const { data: users, total, page, totalPages } = result
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search)
  const [createState, createFormAction, createPending] = useActionState(createUserAction, initialManageUserState)
  const [resetTarget, setResetTarget] = useState<SelectedUser | null>(null)

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      <Card className="shrink-0">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><ShieldPlus className="size-4" /> Create User</CardTitle></CardHeader>
        <CardContent>
          <form action={createFormAction} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
            <Input name="fullName" placeholder="Full name" required />
            <Input name="email" placeholder="Email" required type="email" />
            <Input name="password" placeholder="Password" required type="password" />
            <Select name="role" defaultValue="standard_user">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="w-full md:col-span-2 lg:col-span-1" disabled={createPending}>{createPending ? "Creating..." : "Create User"}</Button>
          </form>
          {createState.message && <p className={`mt-2 text-sm ${createState.kind === "error" ? "text-destructive" : "text-green-600"}`}>{createState.message}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="shrink-0 text-sm text-muted-foreground">{total} users</p>
          <SearchBar
            value={searchValue}
            onValueChange={setSearchValue}
            onSearch={(v) => router.push(v ? `/super-admin/users?search=${encodeURIComponent(v)}` : "/super-admin/users")}
            name="search"
            placeholder="Search by name, email, role…"
            containerClassName="w-full sm:w-64 sm:shrink-0"
            inputClassName="h-8 text-sm md:text-sm"
          />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs pl-4">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
                <TableHead className="text-xs w-10" />
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
                    <TableCell className="whitespace-normal text-xs text-muted-foreground" suppressHydrationWarning>{fmt(u.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Reset password"
                        onClick={() => setResetTarget({ id: u.id, email: u.email, fullName: u.full_name ?? null })}
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
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
