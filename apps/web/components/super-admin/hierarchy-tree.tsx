"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Building2,
  ChevronRight,
  Folder,
  FolderOpen,
  GraduationCap,
  Search,
  Users,
} from "lucide-react"
import { COURSE_STATUS_LABELS } from "@coursebridge/workflow"
import type { OrgTreeNode } from "@/lib/super-admin/queries"
import { getUnitDetail, type UnitDetail } from "@/app/(dashboard)/super-admin/hierarchy-actions"
import {
  ROLE_LEGEND_ORDER,
  ROLE_TITLE_LABELS,
  ROLE_TITLE_STYLES,
  roleTitleStyle,
} from "@/lib/super-admin/roles"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function statusLabel(status: string) {
  return COURSE_STATUS_LABELS[status as keyof typeof COURSE_STATUS_LABELS] ?? status
}

function HierarchyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
      <span className="font-semibold text-muted-foreground">Roles:</span>
      {ROLE_LEGEND_ORDER.map((key) => {
        const s = ROLE_TITLE_STYLES[key]
        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${s.dot}`} />
            <span className={s.text}>{ROLE_TITLE_LABELS[key]}</span>
          </span>
        )
      })}
    </div>
  )
}

function UnitIcon({ unitType, open, className }: { unitType?: string; open: boolean; className?: string }) {
  if (unitType === "college") return <Building2 className={className} />
  if (unitType === "faculty" || unitType === "school") return <GraduationCap className={className} />
  return open ? <FolderOpen className={className} /> : <Folder className={className} />
}

// A single flattened, currently-visible tree row plus the metadata the renderer
// and keyboard navigation need. Rebuilt whenever expansion/search changes.
type Row = {
  node: OrgTreeNode
  depth: number
  parentKey: string | null
  parentUnitName: string | null
  hasChildren: boolean
  isOpen: boolean
  subUnitCount: number
  leaderCount: number
}

type Selected = { node: OrgTreeNode; parentUnitName: string | null }

function isUnit(node: OrgTreeNode) {
  return node.data.kind === "unit"
}

function nodeMatches(node: OrgTreeNode, q: string) {
  return (
    node.data.name.toLowerCase().includes(q) ||
    (node.data.title?.toLowerCase().includes(q) ?? false)
  )
}

/**
 * Prunes the tree to nodes that match `q` or have a matching descendant. A
 * matched node keeps its full subtree (so you can browse what you found);
 * non-matching ancestors keep only the branches that lead to a match.
 */
function filterTree(nodes: OrgTreeNode[], q: string): OrgTreeNode[] {
  const out: OrgTreeNode[] = []
  for (const n of nodes) {
    const self = nodeMatches(n, q)
    const children = n.children ?? []
    if (self) {
      out.push(n)
      continue
    }
    const kept = children.length ? filterTree(children, q) : []
    if (kept.length > 0) out.push({ ...n, children: kept })
  }
  return out
}

// Collects the default-open unit keys from the server-built tree (roots are
// flagged `expanded` in buildOrgTree).
function defaultExpanded(nodes: OrgTreeNode[], acc: Set<string>): Set<string> {
  for (const n of nodes) {
    if (isUnit(n) && n.expanded) acc.add(n.key)
    if (n.children) defaultExpanded(n.children, acc)
  }
  return acc
}

export function HierarchyTree({ tree }: { tree: OrgTreeNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded(tree, new Set()))
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Selected | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [detail, setDetail] = useState<UnitDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  // Re-seed expansion if the server hands us a fresh tree.
  useEffect(() => {
    setExpanded(defaultExpanded(tree, new Set()))
  }, [tree])

  const q = query.trim().toLowerCase()
  const queryActive = q.length > 0
  const filteredTree = useMemo(() => (queryActive ? filterTree(tree, q) : tree), [tree, q, queryActive])

  // Flatten the visible tree (respecting expansion / forced-open-while-searching)
  // into render order. While searching, every visible unit renders open.
  const rows = useMemo(() => {
    const acc: Row[] = []
    const walk = (nodes: OrgTreeNode[], depth: number, parentKey: string | null, parentUnitName: string | null) => {
      for (const n of nodes) {
        const children = n.children ?? []
        const unit = isUnit(n)
        const subUnitCount = unit ? children.filter(isUnit).length : 0
        const leaderCount = unit ? children.length - subUnitCount : 0
        const hasChildren = unit && children.length > 0
        const isOpen = unit && (queryActive ? true : expanded.has(n.key))
        acc.push({ node: n, depth, parentKey, parentUnitName, hasChildren, isOpen, subUnitCount, leaderCount })
        if (isOpen && hasChildren) walk(children, depth + 1, n.key, n.data.name)
      }
    }
    walk(filteredTree, 0, null, null)
    return acc
  }, [filteredTree, expanded, queryActive])

  const selectedUnitId = selected && isUnit(selected.node) ? selected.node.data.id : null

  // Auto-select the first root unit on first paint so the detail pane isn't empty.
  // Intentionally does not move DOM focus (avoids stealing focus / scroll on load).
  useEffect(() => {
    if (selected || tree.length === 0) return
    const firstRoot = tree.find(isUnit) ?? tree[0]
    if (firstRoot) {
      setSelected({ node: firstRoot, parentUnitName: null })
      setActiveKey(firstRoot.key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree])

  // Load unit detail (leadership, sub-units, courses) for the selected unit.
  // Guarded against out-of-order responses when the user clicks quickly.
  useEffect(() => {
    if (!selectedUnitId) {
      setDetail(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetail(null)
    setDetailLoading(true)
    getUnitDetail(selectedUnitId)
      .then((d) => { if (!cancelled) setDetail(d) })
      .catch(() => { if (!cancelled) setDetail(null) })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedUnitId])

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const setRowRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(key, el)
    else rowRefs.current.delete(key)
  }, [])

  // Move keyboard focus to a row and keep it in view. Used by arrow-key nav.
  const focusRow = useCallback((key: string) => {
    setActiveKey(key)
    const el = rowRefs.current.get(key)
    el?.focus()
    el?.scrollIntoView({ block: "nearest" })
  }, [])

  // Select a row (open its detail) and keep focus on it so subsequent keyboard
  // nav continues from the selection.
  const selectRow = useCallback((row: Row) => {
    setSelected({ node: row.node, parentUnitName: row.parentUnitName })
    setActiveKey(row.node.key)
    rowRefs.current.get(row.node.key)?.focus()
  }, [])

  const effectiveActiveKey = activeKey ?? rows[0]?.node.key ?? null

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (rows.length === 0) return
      // `idx` is -1 when the active key was filtered/collapsed away; treat that as
      // "no current row" so up/down both land on the first row symmetrically.
      const idx = rows.findIndex((r) => r.node.key === effectiveActiveKey)
      const cur = idx >= 0 ? rows[idx] : rows[0]
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const next = idx < 0 ? rows[0] : rows[Math.min(rows.length - 1, idx + 1)]
          focusRow(next.node.key)
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const prev = idx < 0 ? rows[0] : rows[Math.max(0, idx - 1)]
          focusRow(prev.node.key)
          break
        }
        case "ArrowRight": {
          e.preventDefault()
          if (cur.hasChildren && !cur.isOpen && !queryActive) toggle(cur.node.key)
          else if (cur.hasChildren && cur.isOpen) {
            const child = idx >= 0 ? rows[idx + 1] : undefined
            if (child && child.parentKey === cur.node.key) focusRow(child.node.key)
          }
          break
        }
        case "ArrowLeft": {
          e.preventDefault()
          if (cur.hasChildren && cur.isOpen && !queryActive) toggle(cur.node.key)
          else if (cur.parentKey && rows.some((r) => r.node.key === cur.parentKey)) {
            focusRow(cur.parentKey)
          }
          break
        }
        case "Enter":
        case " ": {
          e.preventDefault()
          selectRow(cur)
          break
        }
        case "Home": {
          e.preventDefault()
          focusRow(rows[0].node.key)
          break
        }
        case "End": {
          e.preventDefault()
          focusRow(rows[rows.length - 1].node.key)
          break
        }
      }
    },
    [rows, effectiveActiveKey, focusRow, toggle, selectRow, queryActive],
  )

  if (tree.length === 0) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No organizational units yet. Seed the hierarchy to populate this tree.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <HierarchyLegend />

      <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-15rem)] lg:min-h-[28rem] lg:grid-cols-[minmax(260px,360px)_1fr]">
        {/* Tree pane */}
        <div className="flex max-h-[60vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card lg:max-h-none">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter units or people…"
                aria-label="Filter units or people"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No units or people match “{query}”.</p>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div
                role="tree"
                aria-label="Organization hierarchy"
                className="py-1"
                onKeyDown={onKeyDown}
              >
                {rows.map((row) => (
                  <TreeRow
                    key={row.node.key}
                    row={row}
                    selected={selected?.node.key === row.node.key}
                    active={effectiveActiveKey === row.node.key}
                    onToggle={toggle}
                    onSelect={selectRow}
                    setRowRef={setRowRef}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Detail pane */}
        <div
          role="region"
          aria-label="Selection details"
          className="flex min-h-[20rem] flex-col overflow-hidden rounded-lg border border-border bg-card lg:min-h-0"
        >
          <DetailPane selected={selected} detail={detail} loading={detailLoading} />
        </div>
      </div>
    </div>
  )
}

const TreeRow = memo(function TreeRow({
  row,
  selected,
  active,
  onToggle,
  onSelect,
  setRowRef,
}: {
  row: Row
  selected: boolean
  active: boolean
  onToggle: (key: string) => void
  onSelect: (row: Row) => void
  setRowRef: (key: string, el: HTMLDivElement | null) => void
}) {
  const { node, depth, hasChildren, isOpen, subUnitCount, leaderCount } = row
  const d = node.data
  const member = d.kind === "member"
  const s = member ? roleTitleStyle(d.rawTitle) : null

  const meta: string[] = []
  if (subUnitCount > 0) meta.push(`${subUnitCount} unit${subUnitCount === 1 ? "" : "s"}`)
  if (leaderCount > 0) meta.push(`${leaderCount} leader${leaderCount === 1 ? "" : "s"}`)

  return (
    <div
      ref={(el) => setRowRef(node.key, el)}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? isOpen : undefined}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(row)}
      className={cn(
        "group flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
      style={{ paddingLeft: depth * 14 + 6 }}
    >
      {/* Chevron toggle, or an equal-width spacer for leaf nodes */}
      {hasChildren ? (
        <button
          type="button"
          aria-label={isOpen ? `Collapse ${d.name}` : `Expand ${d.name}`}
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onToggle(node.key) }}
          className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}

      {/* Icon: role dot for people, type icon for units */}
      {member ? (
        <span className="flex size-4 shrink-0 items-center justify-center">
          <span className={cn("size-2.5 rounded-full", s!.dot)} />
        </span>
      ) : (
        <UnitIcon unitType={d.unitType} open={isOpen} className="size-4 shrink-0 text-foreground/70" />
      )}

      {/* Label */}
      <span className={cn("min-w-0 flex-1 truncate text-sm", member ? "font-normal" : "font-medium")}>
        {d.name}
      </span>

      {/* Trailing meta: role chip for people, counts for units */}
      {member ? (
        <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium", s!.chip)}>
          {d.title}
        </span>
      ) : meta.length > 0 ? (
        <span className="shrink-0 text-[10px] text-muted-foreground">{meta.join(" · ")}</span>
      ) : null}
    </div>
  )
})

function DetailPane({
  selected,
  detail,
  loading,
}: {
  selected: Selected | null
  detail: UnitDetail | null
  loading: boolean
}) {
  if (!selected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <Building2 className="size-7 text-muted-foreground" />
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          Select a unit or person in the tree to see leadership, sub-units, and courses.
        </p>
      </div>
    )
  }

  const d = selected.node.data

  // Member detail — name, role, and where they sit.
  if (d.kind === "member") {
    const s = roleTitleStyle(d.rawTitle)
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className={cn("size-3 rounded-full", s.dot)} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{d.name}</h3>
            <p className={cn("text-sm font-medium", s.text)}>{d.title}</p>
          </div>
        </div>
        {selected.parentUnitName && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit</p>
            <p className="mt-0.5 text-sm">{selected.parentUnitName}</p>
          </div>
        )}
      </div>
    )
  }

  // Unit detail.
  return (
    <>
      <div className="border-b border-border p-5 pb-4">
        <h3 className="text-lg font-semibold">{loading ? "Loading…" : detail?.unit?.name ?? d.name}</h3>
        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
          {detail?.unit?.type ?? d.unitType}
          {detail ? ` · ${detail.courseTotal} course${detail.courseTotal === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : detail ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-5">
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" /> Leadership
              </h4>
              {detail.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leadership assigned to this unit.</p>
              ) : (
                <div className="space-y-1">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{m.name}</span>
                      <Badge variant="secondary" className="shrink-0">{m.title}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {detail.childUnits.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-units</h4>
                <div className="flex flex-wrap gap-1">
                  {detail.childUnits.map((c) => (
                    <Badge key={c.id} variant="outline">{c.name}</Badge>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      className="flex items-center justify-between gap-2 border-b border-border/50 py-1 text-sm last:border-0"
                    >
                      <span className="truncate">{c.title}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{statusLabel(c.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      ) : null}
    </>
  )
}
