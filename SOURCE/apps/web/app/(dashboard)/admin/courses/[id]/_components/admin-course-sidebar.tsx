"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import type { AdminCourseRow } from "@/lib/admin/queries"
import type { OrgUnit } from "@/lib/repositories/contracts"
import type { EscalationWithMessages } from "@/lib/services/escalations"
import { approveReviewAction, requestFixesAction, updateCourseDepartmentAction } from "../../../actions"
import { sendEscalationReplyAction, resolveEscalationAction } from "../actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, MessageSquare, AlertTriangle, Clock, User, Send, Building2, ChevronDown, ChevronRight, ChevronLeft, Layout } from "lucide-react"
import { StatusBadge } from "@/components/courses/status-badge"
import { Separator } from "@/components/ui/separator"
import type { CourseComment } from "@/lib/services/comments"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CelebrationOverlay } from "@/components/mindfresh/CelebrationOverlay"

interface Props {
  course: AdminCourseRow
  escalations: EscalationWithMessages[]
  currentUserId: string
  departments: OrgUnit[]
  comments: CourseComment[]
  instructorName: string | null
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-400/30",
  major:    "bg-orange-500/15 text-orange-600 border-orange-400/30",
  minor:    "bg-yellow-500/15 text-yellow-700 border-yellow-400/30",
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function AdminCourseSidebar({ course, escalations, currentUserId, departments, comments, instructorName }: Props) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [resolveState, setResolveState] = useState<Record<string, { open: boolean; note: string }>>({})
  const router = useRouter()

  const openEscalations = escalations.filter((e) => e.status === "open")

  function isResolveOpen(id: string) { return resolveState[id]?.open ?? false }
  function getResolveNote(id: string) { return resolveState[id]?.note ?? "" }
  function openResolve(id: string) { setResolveState(s => ({ ...s, [id]: { open: true, note: s[id]?.note ?? "" } })) }
  function cancelResolve(id: string) { setResolveState(s => ({ ...s, [id]: { open: false, note: "" } })) }
  function setEscalationNote(id: string, value: string) { setResolveState(s => ({ ...s, [id]: { ...s[id], note: value } })) }

  function handleApprove() {
    startTransition(async () => {
      await approveReviewAction(course.id)
      toast.success("Course approved")
      setCelebrate(true)
    })
  }

  function handleSendFixes() {
    startTransition(async () => {
      await requestFixesAction(course.id, note)
      toast.info("Fixes requested from TA")
      router.push("/admin")
    })
  }

  function handleDeptChange(value: string) {
    const orgUnitId = value === "unassigned" ? null : value
    startTransition(async () => {
      try {
        await updateCourseDepartmentAction(course.id, orgUnitId)
        toast.success("Department updated")
      } catch (error) {
        toast.error("Failed to update department")
      }
    })
  }

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-l border-border-icy bg-sidebar/40 flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full hover:bg-white/5"
          onClick={() => setIsCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="h-px w-6 bg-border-icy" />
        <div className="flex flex-col gap-6 py-2">
          <Building2 className="size-5 text-muted-foreground/20" />
          <User className="size-5 text-muted-foreground/20" />
          <AlertTriangle className="size-5 text-muted-foreground/20" />
        </div>
      </div>
    )
  }

  return (
    <>
    <CelebrationOverlay
      open={celebrate}
      context="an admin just approved a course migration review"
      onDone={() => { setCelebrate(false); router.push("/admin") }}
    />
    <div className="w-[420px] h-full flex flex-col border-l border-border-icy bg-sidebar/40 transition-all duration-300 relative overflow-hidden backdrop-blur-md">
      {/* Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full hover:bg-white/5 border border-border-icy"
          onClick={() => setIsCollapsed(true)}
          title="Collapse sidebar"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8 p-6 pb-12 h-full">
          {/* Status Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Current Status</h3>
              <StatusBadge status={course.status} className="h-5" />
            </div>
            <Separator className="bg-border-icy" />
          </section>

          {/* Participants Section */}
          <section className="space-y-6 pr-4">
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 group">
                  <Avatar className="size-9 border border-primary/20 bg-primary/5 ring-2 ring-primary/5 transition-all group-hover:ring-primary/10">
                    <AvatarFallback className="text-xs font-black text-primary">
                      {getInitials(course.ta?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Lead TA</span>
                    <span className="text-sm font-bold text-foreground">
                      {course.ta?.name ?? course.ta?.email ?? "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 group">
                  {instructorName ? (
                    <Avatar className="size-9 border border-info/20 bg-info/5 ring-2 ring-info/5 transition-all group-hover:ring-info/10">
                      <AvatarFallback className="text-xs font-black text-info">
                        {getInitials(instructorName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-9 flex items-center justify-center rounded-full border border-dashed border-border-icy bg-white/5">
                      <User className="size-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Course Instructor</span>
                    <span className={cn("text-sm font-bold", instructorName ? "text-foreground" : "text-muted-foreground/40 italic")}>
                      {instructorName ?? "Pending Selection"}
                    </span>
                  </div>
                </div>
             </div>
          </section>

          <Separator className="bg-border-icy" />

          {/* Metadata Grid */}
          <section className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-border-icy bg-white/5 space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                      <Clock className="size-3" /> Updated
                   </p>
                   <p className="text-xs font-bold text-foreground/80">
                      {new Date(course.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                   </p>
                </div>
                <div className="p-3 rounded-xl border border-border-icy bg-white/5 space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                      <Building2 className="size-3" /> Department
                   </p>
                   <Select 
                      value={course.orgUnitId ?? "unassigned"} 
                      onValueChange={handleDeptChange}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full h-5 p-0 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
             </div>
          </section>

          <Separator className="bg-border-icy" />

          {/* Admin Actions */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Review Control</h3>
            {!fixesOpen ? (
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="approve"
                  className="w-full justify-start h-10 font-black uppercase tracking-widest text-[10px] border border-success/30 shadow-lg shadow-success/5"
                  disabled={isPending || course.status !== "submitted_to_admin"}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve Course
                </Button>
                <Button
                  variant="warning"
                  className="w-full justify-start h-10 font-black uppercase tracking-widest text-[10px] border border-warning/30"
                  disabled={isPending || course.status !== "submitted_to_admin"}
                  onClick={() => setFixesOpen(true)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  Request Fixes
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl border border-warning/20 bg-warning/5 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-warning/70">Adjustment Notes</p>
                <Textarea
                  autoFocus
                  placeholder="Describe the requested changes..."
                  className="bg-background/80 border-border-icy min-h-[100px] text-xs font-medium focus:border-warning/50 transition-all rounded-xl"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="destructive" className="flex-1 h-9 text-[10px] font-black uppercase tracking-widest" disabled={isPending} onClick={handleSendFixes}>
                    Send Request
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 h-9 text-[10px] font-bold uppercase" disabled={isPending} onClick={() => { setFixesOpen(false); setNote("") }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Escalation Threads */}
          {openEscalations.length > 0 && (
            <section className="shrink-0 space-y-4 pt-4 border-t border-border-icy">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Active Resolve Controls</h3>
              <div className="space-y-2">
                {openEscalations.map(e => (
                  <div key={e.id} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate flex-1 pr-2 text-foreground/80">{e.title}</span>
                      {!isResolveOpen(e.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-[9px] uppercase font-black tracking-widest text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white transition-all rounded-lg"
                          onClick={() => openResolve(e.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    {isResolveOpen(e.id) && (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs resize-none h-14 focus:outline-none focus:border-green-500"
                          placeholder="Resolution note for TA (optional)..."
                          value={getResolveNote(e.id)}
                          onChange={(ev) => setEscalationNote(e.id, ev.target.value)}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 flex-1 text-[9px] uppercase font-black tracking-widest bg-green-600 hover:bg-green-700 text-white rounded-lg"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await resolveEscalationAction(e.id, course.id, getResolveNote(e.id).trim() || undefined)
                                cancelResolve(e.id)
                              })
                            }}
                          >
                            {isPending ? "Saving…" : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[9px] uppercase font-black tracking-widest rounded-lg"
                            disabled={isPending}
                            onClick={() => cancelResolve(e.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
