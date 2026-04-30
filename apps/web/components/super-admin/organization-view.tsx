"use client"

import { useActionState, useState, useEffect } from "react"
import { Building2, Users, Trash2, Plus, Search, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import type { SuperAdminData } from "@/lib/super-admin/queries"
import {
  createUnitAction,
  addUnitMemberAction,
  removeUnitMemberAction,
} from "@/app/(dashboard)/super-admin/actions"

const initialState = { kind: "idle" as const, message: null }

export function OrganizationView({ data }: { data: SuperAdminData }) {
  const { units, members, users } = data
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [unitSearch, setUnitSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  const [unitState, unitFormAction, unitPending] = useActionState(createUnitAction, initialState)
  const [memberState, memberFormAction, memberPending] = useActionState(addUnitMemberAction, initialState)

  useEffect(() => {
    if (unitState.kind === "success") setCreateOpen(false)
  }, [unitState.kind])

  useEffect(() => {
    if (memberState.kind === "success") setAddMemberOpen(false)
  }, [memberState.kind])

  const selectedUnit = units.find(u => u.id === selectedUnitId)
  const selectedUnitMembers = members.filter(m => m.orgUnitId === selectedUnitId)

  const filteredUnits = units.filter(u => {
    const q = unitSearch.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q)
  })

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 overflow-hidden">

        {/* Units List */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0">
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
            <CardHeader className="flex flex-col gap-3 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Organizational Units
                  <span className="text-xs font-normal text-muted-foreground">({units.length})</span>
                </CardTitle>
                <Button size="icon" variant="outline" className="size-7" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={unitSearch}
                  onChange={e => setUnitSearch(e.target.value)}
                  placeholder="Search by name or type..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              {unitSearch.trim() && (
                <p className="text-[10px] text-muted-foreground -mt-1">
                  {filteredUnits.length} of {units.length} units
                </p>
              )}
            </CardHeader>

            <CardContent className="p-0 overflow-y-auto flex-1 border-t border-border">
              <div className="divide-y divide-border">
                {filteredUnits.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {unitSearch ? "No units match your search." : "No units defined."}
                  </p>
                ) : (
                  filteredUnits.map(unit => {
                    const memberCount = members.filter(m => m.orgUnitId === unit.id).length
                    const parentName = unit.parentId ? units.find(u => u.id === unit.parentId)?.name : null
                    return (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1 ${
                          selectedUnitId === unit.id ? "bg-muted border-l-2 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{unit.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {memberCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                                <Users className="size-2.5" />{memberCount}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] uppercase h-4 px-1">{unit.type}</Badge>
                          </div>
                        </div>
                        {parentName && (
                          <span className="text-[10px] text-muted-foreground">
                            Under: {parentName}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unit Details & Members */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full min-h-0">
          {selectedUnit ? (
            <>
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedUnit.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {selectedUnit.type.charAt(0).toUpperCase() + selectedUnit.type.slice(1)}
                        {selectedUnit.parentId && (
                          <> · Under: {units.find(u => u.id === selectedUnit.parentId)?.name}</>
                        )}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => setAddMemberOpen(true)}>
                      <Plus className="size-3.5" /> Add Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="pl-6 text-xs uppercase font-semibold">User</TableHead>
                        <TableHead className="text-xs uppercase font-semibold">Title</TableHead>
                        <TableHead className="w-[80px] text-right pr-6" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUnitMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                            No members assigned to this unit.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedUnitMembers.map(member => {
                          const user = users.find(u => u.id === member.profileId)
                          return (
                            <TableRow key={member.id} className="border-border">
                              <TableCell className="pl-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{user?.full_name ?? user?.email ?? "Unknown"}</span>
                                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize font-semibold bg-primary/5 text-primary border-primary/10">
                                  {member.title.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeUnitMemberAction(member.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-muted/20 border-dashed shadow-none">
                <CardContent className="p-4 flex items-start gap-3">
                  <Users className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Insight</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Members with titles like <strong>Dean</strong> or <strong>Dept Head</strong> automatically inherit
                      view-only access to all courses tagged with this unit or its sub-departments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex-1 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-12 space-y-3">
              <div className="bg-muted p-4 rounded-full">
                <Building2 className="size-8 text-muted-foreground" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-sm font-semibold">No Unit Selected</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Select an organizational unit from the list to view and manage its members.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Unit Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right">
          <SheetHeader className="border-b border-border">
            <SheetTitle>New Organizational Unit</SheetTitle>
          </SheetHeader>
          <form action={unitFormAction} className="flex flex-col gap-5 p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input name="name" placeholder="e.g. Mathematics Department" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Type</label>
              <Select name="type" defaultValue="department">
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Parent Unit <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Select name="parentId">
                <SelectTrigger className="h-9"><SelectValue placeholder="None — top level" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="">None — top level</SelectItem>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {unitState.kind === "error" && (
              <p className="text-xs text-destructive">{unitState.message}</p>
            )}
            <Button type="submit" disabled={unitPending} className="mt-2">
              {unitPending ? "Creating..." : "Create Unit"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Member Sheet */}
      {selectedUnit && (
        <AddMemberSheet
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          unit={selectedUnit}
          users={users}
          memberFormAction={memberFormAction}
          pending={memberPending}
          state={memberState}
        />
      )}
    </div>
  )
}

function AddMemberSheet({
  open, onOpenChange, unit, users, memberFormAction, pending, state,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  unit: { id: string; name: string }
  users: { id: string; full_name?: string | null; email?: string | null }[]
  memberFormAction: (payload: FormData) => void
  pending: boolean
  state: { kind: string; message: string | null }
}) {
  const [userSearch, setUserSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [title, setTitle] = useState("dept_head")

  useEffect(() => {
    if (!open) {
      setUserSearch("")
      setSelectedUserId("")
      setTitle("dept_head")
    }
  }, [open])

  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return true
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
  })

  const displayUsers = filteredUsers.slice(0, 100)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 w-[440px] sm:max-w-[440px]">
        <SheetHeader className="border-b border-border p-4 pb-4">
          <SheetTitle>Add Member to {unit.name}</SheetTitle>
        </SheetHeader>

        <form action={memberFormAction} className="flex flex-col flex-1 overflow-hidden">
          <input type="hidden" name="orgUnitId" value={unit.id} />
          <input type="hidden" name="profileId" value={selectedUserId} />
          <input type="hidden" name="title" value={title} />

          <div className="p-4 pb-3 space-y-3 border-b border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Search User</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Name or email..."
                  className="h-9 pl-8 text-sm"
                  autoFocus
                />
              </div>
              {userSearch.trim() && (
                <p className="text-[10px] text-muted-foreground">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
                  {filteredUsers.length > 100 && " — showing first 100"}
                </p>
              )}
            </div>
          </div>

          {/* Scrollable user list */}
          <div className="flex-1 overflow-y-auto">
            {displayUsers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No users found.</p>
            ) : (
              <div className="divide-y divide-border">
                {displayUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                      selectedUserId === u.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name ?? u.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {selectedUserId === u.id && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 space-y-3">
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

            {state.kind === "error" && (
              <p className="text-xs text-destructive">{state.message}</p>
            )}

            <Button type="submit" disabled={pending || !selectedUserId} className="w-full">
              {pending ? "Assigning..." : selectedUserId ? "Assign Member" : "Select a user first"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
