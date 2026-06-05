"use client"

import "primereact/resources/themes/lara-light-indigo/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"

import { useState } from "react"
import { OrganizationChart } from "primereact/organizationchart"
import type { TreeNode } from "primereact/treenode"
import { Building2, Folder, GraduationCap } from "lucide-react"
import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"
import type { OrgTreeNode } from "@/lib/super-admin/queries"
import { getUnitDetail, type UnitDetail } from "@/app/(dashboard)/super-admin/hierarchy-actions"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

type NodeData = OrgTreeNode["data"]

function statusLabel(status: string) {
  return COURSE_STATUS_LABELS[status as keyof typeof COURSE_STATUS_LABELS] ?? status
}

// Role/level coloring for leadership nodes. Keyed by the raw title so the dot,
// card accent, and legend all stay in sync. Class strings are literal so
// Tailwind's JIT keeps them.
type TitleStyle = { dot: string; border: string; text: string; label: string }
const TITLE_STYLES: Record<string, TitleStyle> = {
  vp:             { dot: "bg-purple-500",  border: "border-l-purple-500",  text: "text-purple-600 dark:text-purple-300",   label: "VP" },
  dean:           { dot: "bg-blue-500",    border: "border-l-blue-500",    text: "text-blue-600 dark:text-blue-300",       label: "Dean" },
  associate_dean: { dot: "bg-sky-500",     border: "border-l-sky-500",     text: "text-sky-600 dark:text-sky-300",         label: "Associate Dean" },
  assistant_dean: { dot: "bg-cyan-500",    border: "border-l-cyan-500",    text: "text-cyan-600 dark:text-cyan-300",       label: "Assistant Dean" },
  dept_head:      { dot: "bg-emerald-500", border: "border-l-emerald-500", text: "text-emerald-600 dark:text-emerald-300", label: "Department Head" },
  educator:       { dot: "bg-amber-500",   border: "border-l-amber-500",   text: "text-amber-600 dark:text-amber-300",     label: "Educator" },
  admin:          { dot: "bg-rose-500",    border: "border-l-rose-500",    text: "text-rose-600 dark:text-rose-300",       label: "Admin" },
  staff:          { dot: "bg-slate-400",   border: "border-l-slate-400",   text: "text-slate-500 dark:text-slate-300",     label: "Staff" },
}
const DEFAULT_TITLE_STYLE: TitleStyle = { dot: "bg-muted-foreground", border: "border-l-border", text: "text-muted-foreground", label: "Member" }

function titleStyle(rawTitle?: string): TitleStyle {
  return (rawTitle && TITLE_STYLES[rawTitle]) || DEFAULT_TITLE_STYLE
}

// Render order for the legend (matches seniority).
const LEGEND_ORDER = ["vp", "dean", "associate_dean", "assistant_dean", "dept_head", "educator", "admin", "staff"] as const

function HierarchyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
      <span className="font-semibold text-muted-foreground">Roles:</span>
      {LEGEND_ORDER.map((key) => {
        const s = TITLE_STYLES[key]
        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${s.dot}`} />
            <span className={s.text}>{s.label}</span>
          </span>
        )
      })}
    </div>
  )
}

export function HierarchyChart({ tree }: { tree: OrgTreeNode[] }) {
  const [selection, setSelection] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<UnitDetail | null>(null)
  const [member, setMember] = useState<NodeData | null>(null)

  if (tree.length === 0) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No organizational units yet. Seed the hierarchy to populate this chart.
      </div>
    )
  }

  const nodeTemplate = (node: TreeNode) => {
    const d = node.data as NodeData
    if (d.kind === "member") {
      const s = titleStyle(d.rawTitle)
      return (
        <div className={`flex w-44 items-center gap-2 rounded-md border-l-4 ${s.border} bg-background/60 px-2 py-1 text-left`}>
          <span className={`size-2.5 shrink-0 rounded-full ${s.dot}`} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{d.name}</div>
            <div className={`truncate text-xs font-medium ${s.text}`}>{d.title}</div>
          </div>
        </div>
      )
    }
    const Icon = d.unitType === "college" ? Building2 : d.unitType === "school" ? GraduationCap : Folder
    return (
      <div className="flex w-44 items-center gap-2 text-left">
        <Icon className="size-4 shrink-0 text-foreground/70" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{d.name}</div>
          <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {d.unitType}
          </div>
        </div>
      </div>
    )
  }

  const onSelect = async (node: TreeNode) => {
    const d = node.data as NodeData
    if (d.kind === "member") {
      setMember(d)
      setDetail(null)
      setOpen(true)
      return
    }
    setMember(null)
    setDetail(null)
    setLoading(true)
    setOpen(true)
    try {
      setDetail(await getUnitDetail(d.id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Click any unit or person to open its details. Use the +/- togglers to expand or collapse
        branches. Leadership is colored and ordered by role.
      </p>
      <HierarchyLegend />
      <div className="h-[calc(100vh-13rem)] overflow-auto rounded-lg border border-border bg-card p-4">
        <OrganizationChart
          value={tree as unknown as TreeNode[]}
          selectionMode="single"
          selection={selection as TreeNode}
          onSelectionChange={(e) => setSelection(e.data)}
          onNodeSelect={(e) => onSelect(e.node as TreeNode)}
          nodeTemplate={nodeTemplate}
        />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
          {member ? (
            <SheetHeader>
              <SheetTitle>{member.name}</SheetTitle>
              <SheetDescription>{member.title}</SheetDescription>
            </SheetHeader>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{loading ? "Loading…" : (detail?.unit?.name ?? "Unit")}</SheetTitle>
                <SheetDescription>
                  {detail?.unit?.type}
                  {detail ? ` · ${detail.courseTotal} course${detail.courseTotal === 1 ? "" : "s"}` : ""}
                </SheetDescription>
              </SheetHeader>

              {loading ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-2/3" />
                </div>
              ) : detail ? (
                <ScrollArea className="mt-4 flex-1 pr-3">
                  {detail.members.length > 0 && (
                    <section className="mb-5">
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Leadership
                      </h4>
                      <div className="space-y-1">
                        {detail.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{m.name}</span>
                            <Badge variant="secondary" className="shrink-0">
                              {m.title}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {detail.childUnits.length > 0 && (
                    <section className="mb-5">
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Sub-units
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {detail.childUnits.map((c) => (
                          <Badge key={c.id} variant="outline">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Courses{" "}
                      {detail.courseTotal > detail.courses.length
                        ? `(showing ${detail.courses.length} of ${detail.courseTotal})`
                        : `(${detail.courseTotal})`}
                    </h4>
                    {detail.courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No courses in this unit.</p>
                    ) : (
                      <div className="space-y-1">
                        {detail.courses.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-2 border-b border-border/50 py-1 text-sm"
                          >
                            <span className="truncate">{c.title}</span>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {statusLabel(c.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </ScrollArea>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
