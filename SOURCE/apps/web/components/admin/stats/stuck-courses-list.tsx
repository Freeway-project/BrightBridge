import type { StuckCourse } from "@/lib/repositories/contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/courses/status-badge"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Props {
  stuckCourses: StuckCourse[]
}

export function StuckCoursesList({ stuckCourses }: Props) {
  const sorted = [...stuckCourses].sort((a, b) => b.days_stuck - a.days_stuck)

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          <AlertTriangle className="size-3.5 text-orange-500" />
          Stuck Courses (&gt;5 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">No stuck courses</p>
            <p className="text-xs text-muted-foreground">Everything is moving</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {sorted.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{course.title}</p>
                    <StatusBadge status={course.status} className="mt-1 h-4 text-[9px]" />
                  </div>
                  <div className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider",
                    course.days_stuck >= 10
                      ? "bg-red-500/10 text-red-500"
                      : "bg-orange-500/10 text-orange-500"
                  )}>
                    <Clock className="size-3" />
                    {course.days_stuck}d
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
