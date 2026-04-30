"use client"

import { useActionState, useState } from "react"
import { Building2, Users, Trash2, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SuperAdminData } from "@/lib/super-admin/queries"
import {
  createUnitAction,
  addUnitMemberAction,
  removeUnitMemberAction,
} from "@/app/(dashboard)/super-admin/actions"

const initialManageUserState = {
  kind: "idle" as const,
  message: null,
}

export function OrganizationView({ data }: { data: SuperAdminData }) {
  const { units, members, users } = data
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  
  const [unitState, unitFormAction, unitPending] = useActionState(createUnitAction, initialManageUserState)
  const [memberState, memberFormAction, memberPending] = useActionState(addUnitMemberAction, initialManageUserState)

  const selectedUnit = units.find(u => u.id === selectedUnitId)
  const selectedUnitMembers = members.filter(m => m.orgUnitId === selectedUnitId)

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6 bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 overflow-hidden">
        {/* Units Tree List */}
        <div className="lg:col-span-4 flex flex-col space-y-4 h-full min-h-0">
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Organizational Units
              </CardTitle>
              <UnitCreateModal units={units} unitFormAction={unitFormAction} pending={unitPending} />
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 border-t border-border">
              <div className="divide-y divide-border">
                {units.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No units defined.</p>
                ) : (
                  units.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1 ${
                        selectedUnitId === unit.id ? "bg-muted border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{unit.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase h-4 px-1">{unit.type}</Badge>
                      </div>
                      {unit.parentId && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          Under: {units.find(u => u.id === unit.parentId)?.name ?? "Unknown"}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unit Details & Members */}
        <div className="lg:col-span-8 flex flex-col space-y-4 h-full min-h-0">
          {selectedUnit ? (
            <>
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedUnit.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Type: {selectedUnit.type.charAt(0).toUpperCase() + selectedUnit.type.slice(1)}</p>
                    </div>
                    <MemberAddModal 
                      unit={selectedUnit} 
                      users={users} 
                      memberFormAction={memberFormAction} 
                      pending={memberPending} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="pl-6 text-xs uppercase font-semibold">User</TableHead>
                          <TableHead className="text-xs uppercase font-semibold">Title</TableHead>
                          <TableHead className="w-[100px] text-right pr-6">Action</TableHead>
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
                          selectedUnitMembers.map((member) => {
                            const user = users.find(u => u.id === member.profileId)
                            return (
                              <TableRow key={member.id} className="group border-border">
                                <TableCell className="pl-6">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{user?.full_name ?? user?.email ?? "Unknown"}</span>
                                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] capitalize font-semibold bg-primary/5 text-primary border-primary/10">
                                    {member.title.replace("_", " ")}
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
                  </div>
                </CardContent>
              </Card>

              {/* Implicit Hierarchy Insight */}
              <Card className="bg-muted/20 border-dashed shadow-none">
                <CardContent className="p-4 flex items-start gap-3">
                  <Users className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Insight</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Members with titles like <strong>Dean</strong> or <strong>Dept Head</strong> in this unit automatically inherit view-only access to all courses tagged with this unit or its sub-departments.
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
                <p className="text-xs text-muted-foreground mt-1">Select an organizational unit from the list to manage its members and access hierarchy.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UnitCreateModal({ units, unitFormAction, pending }: { units: any[], unitFormAction: any, pending: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" className="size-7" onClick={() => setOpen(!open)}>
        <Plus className="size-4" />
      </Button>
      {open && (
        <div className="absolute top-20 left-10 z-50 bg-card border border-border rounded-lg shadow-xl p-4 w-72 space-y-4">
          <h4 className="text-xs font-bold uppercase">New Unit</h4>
          <form action={unitFormAction} onSubmit={() => setOpen(false)} className="space-y-3">
            <Input name="name" placeholder="Name (e.g. Math Dept)" required className="h-8 text-sm" />
            <Select name="type" defaultValue="department">
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
            <Select name="parentId">
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Parent Unit (Optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Top Level)</SelectItem>
                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button disabled={pending} className="w-full h-8 text-xs">{pending ? "Creating..." : "Create Unit"}</Button>
          </form>
          <Button variant="ghost" className="w-full h-8 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

function MemberAddModal({ unit, users, memberFormAction, pending }: { unit: any, users: any[], memberFormAction: any, pending: boolean }) {
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [title, setTitle] = useState("dept_head")

  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => setOpen(!open)}>
        <Plus className="size-3.5" /> Add Member
      </Button>
      {open && (
        <div className="absolute top-10 right-0 z-50 bg-card border border-border rounded-lg shadow-xl p-4 w-80 space-y-4">
          <h4 className="text-xs font-bold uppercase">Assign Member to {unit.name}</h4>
          <form action={memberFormAction} onSubmit={() => setOpen(false)} className="space-y-3">
            <input type="hidden" name="orgUnitId" value={unit.id} />
            <Select onValueChange={setSelectedUser} value={selectedUser}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select User" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-medium">{u.full_name ?? u.email}</span>
                      <span className="text-[10px] text-muted-foreground">{u.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="profileId" value={selectedUser} />
            
            <Select onValueChange={setTitle} value={title}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dean">Dean</SelectItem>
                <SelectItem value="assistant_dean">Assistant Dean</SelectItem>
                <SelectItem value="dept_head">Dept Head</SelectItem>
                <SelectItem value="educator">Educator</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="title" value={title} />

            <Button disabled={pending || !selectedUser} className="w-full h-9 text-xs">{pending ? "Adding..." : "Assign Member"}</Button>
          </form>
          <Button variant="ghost" className="w-full h-9 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
