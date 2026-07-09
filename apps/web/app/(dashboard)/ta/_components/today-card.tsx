import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { CourseSummary } from "@/lib/courses/service";

interface Props {
  courses: CourseSummary[];
  totalWaiting: number;
}

const PHRASES: Record<string, string> = {
  assigned_to_ta: "just assigned",
  ta_review_in_progress: "in progress",
  admin_changes_requested: "changes requested",
  staging_in_progress: "staging in progress",
};

export function TodayCard({ courses, totalWaiting }: Props) {
  if (courses.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-accent-indigo/25 bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-[0_0_28px_var(--accent-indigo-glow)]"
      aria-label="Today's queue"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-indigo-soft text-accent-indigo">
          <Sparkles className="size-4" />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-accent-indigo">
          Today
        </span>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Continue review on:
      </p>

      <ul className="mb-4 space-y-2">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}`}
              className="group flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent-indigo-soft"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground/70">
                  {c.sourceCourseId ?? "NO-CODE"}
                </span>
                <span className="truncate text-sm font-medium text-foreground group-hover:text-accent-indigo">
                  {c.title}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {PHRASES[c.status] ?? "needs review"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {totalWaiting > courses.length && (
        <Link
          href="#course-list"
          className="mb-4 -mt-2 block px-2 text-xs text-muted-foreground/80 hover:text-accent-indigo"
        >
          + {totalWaiting - courses.length} more
        </Link>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>
          {totalWaiting} {totalWaiting === 1 ? "course" : "courses"} waiting on you
        </span>
        <Link
          href="#course-list"
          className="inline-flex items-center gap-1 font-semibold text-accent-indigo hover:text-accent-indigo-hover"
        >
          Open queue
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
