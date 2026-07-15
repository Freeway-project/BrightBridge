import { Send } from "lucide-react"
import type { InstructorHandoffData } from "@/lib/admin/queries"
import { HandoffSummaryView } from "./handoff-summary"
import { HandoffCourseList } from "./handoff-course-list"

interface Props {
  data: InstructorHandoffData
}

/**
 * The Instructor Handoff Tracker section on /admin/stats: a summary strip
 * (bucket KPIs + per-instructor rollup) over a filterable list of every course
 * currently in an instructor's hands, bucketed by how long since it was sent.
 */
export function InstructorHandoffSection({ data }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Send className="size-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
            Instructor Handoff Tracker
          </h2>
          <p className="text-xs text-muted-foreground">
            Courses sent to instructors — how long they&rsquo;ve been waiting and who hasn&rsquo;t looked yet
          </p>
        </div>
      </div>

      <HandoffSummaryView summary={data.summary} byInstructor={data.byInstructor} />
      <HandoffCourseList courses={data.courses} />
    </section>
  )
}
