"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  getAllowedTransitions,
  getCourseStatusLabel,
  WORKFLOW_PHASES,
  type CourseStatus,
  type EffectiveRole,
  type PipelineStage,
} from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { transitionCourseAction } from "../actions"

export type BoardCard = {
  id: string
  title: string
  sourceCourseId: string | null
  taName: string | null
  status: CourseStatus
  updatedAt: string
}

export type BoardColumn = {
  key: string
  label: string
  phase: PipelineStage
  count: number
  cards: BoardCard[]
}

type Props = {
  columns: BoardColumn[]
  role: EffectiveRole
  /** The existing detailed table, shown when the admin toggles to list view. */
  listView: React.ReactNode
}

export function CoursesBoard({ columns, role, listView }: Props) {
  const [view, setView] = useState<"board" | "list">("list")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {view === "board"
            ? "Drag-free workflow board — click a course to move it to its next step."
            : "Full searchable list of every course."}
        </p>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <ViewToggle active={view === "board"} onClick={() => setView("board")}>
            Board
          </ViewToggle>
          <ViewToggle active={view === "list"} onClick={() => setView("list")}>
            List
          </ViewToggle>
        </div>
      </div>

      {view === "list" ? listView : <BoardView columns={columns} role={role} />}
    </div>
  )
}

/** Board view: phase tabs (Migration · Staging · Provision), each showing its kanban columns. */
function BoardView({ columns, role }: { columns: BoardColumn[]; role: EffectiveRole }) {
  const phases = WORKFLOW_PHASES.map((p) => {
    const phaseColumns = columns.filter((c) => c.phase === p.key)
    return { key: p.key, label: p.label, columns: phaseColumns, count: phaseColumns.reduce((n, c) => n + c.count, 0) }
  })
  const defaultPhase = (phases.find((p) => p.count > 0) ?? phases[0]).key

  return (
    <Tabs defaultValue={defaultPhase} className="w-full">
      <TabsList variant="line">
        {phases.map((p) => (
          <TabsTrigger key={p.key} value={p.key} className="gap-1.5">
            {p.label}
            {p.count > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-current/10 text-[9px] font-black">
                {p.count.toLocaleString()}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {phases.map((p) => (
        <TabsContent key={p.key} value={p.key} className="mt-4 focus-visible:outline-none">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {p.columns.map((col) => (
              <Column key={col.key} column={col} role={role} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Column({ column, role }: { column: BoardColumn; role: EffectiveRole }) {
  const hidden = column.count - column.cards.length
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {column.count.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {column.cards.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No courses</p>
        )}
        {column.cards.map((card) => (
          <BoardCardItem key={card.id} card={card} role={role} />
        ))}
        {hidden > 0 && (
          <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
            + {hidden.toLocaleString()} more — use List view
          </p>
        )}
      </div>
    </div>
  )
}

function BoardCardItem({ card, role }: { card: BoardCard; role: EffectiveRole }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const nextStatuses = getAllowedTransitions({ role, from: card.status })

  function move(to: CourseStatus) {
    setError(null)
    setOpen(false)
    startTransition(async () => {
      const res = await transitionCourseAction(card.id, to)
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? "Move failed")
      }
    })
  }

  return (
    <div className={cn("rounded-md border border-border bg-background p-3 shadow-sm", pending && "opacity-50")}>
      <a href={`/admin/courses/${card.id}`} className="block">
        <p className="line-clamp-2 text-sm font-medium text-foreground hover:underline">{card.title}</p>
      </a>
      {card.sourceCourseId && (
        <p className="mt-0.5 text-xs text-muted-foreground">#{card.sourceCourseId}</p>
      )}
      <div className="mt-2">
        <StatusBadge status={card.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.taName ? `TA: ${card.taName}` : "Unassigned"}
      </p>

      {nextStatuses.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-xs" disabled={pending}>
              {pending ? "Moving…" : "Move →"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Move to…</p>
            {nextStatuses.map((to) => (
              <button
                key={to}
                type="button"
                onClick={() => move(to)}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                {getCourseStatusLabel(to)}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
