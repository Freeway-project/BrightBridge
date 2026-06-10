import Link from "next/link"
import type { CourseStatus } from "@coursebridge/workflow"
import { StatusBadge } from "@/components/courses/status-badge"
import { cn } from "@/lib/utils"

export type SidebarCourse = {
  id: string
  title: string
  status: CourseStatus
  term: string | null
}

/**
 * Left rail shown alongside an open instructor course. Lists the instructor's
 * other assigned courses so they can switch between them without going back to
 * the dashboard. Desktop only — the header dropdown covers small screens.
 */
export function CourseSwitchSidebar({
  currentId,
  courses,
}: {
  currentId: string
  courses: SidebarCourse[]
}) {
  // Nothing to switch to — don't show an empty rail.
  if (courses.length < 2) return null

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your courses
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Switch course">
        {courses.map((c) => {
          const active = c.id === currentId
          return (
            <Link
              key={c.id}
              href={`/instructor/courses/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 transition-colors",
                active
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="block truncate text-sm font-medium">{c.title}</span>
              <span className="mt-1 flex items-center gap-2">
                <StatusBadge status={c.status} className="text-[10px]" />
                {c.term ? (
                  <span className="truncate text-xs text-muted-foreground">{c.term}</span>
                ) : null}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
