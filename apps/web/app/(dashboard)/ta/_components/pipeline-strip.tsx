"use client";

import type { PipelineBuckets } from "@/lib/courses/ta-pipeline";
import { cn } from "@/lib/utils";

interface Props {
  counts: PipelineBuckets;
}

const SEGMENTS = [
  { key: "todo", label: "todo", className: "bg-muted-foreground/40" },
  { key: "inProgress", label: "in progress", className: "bg-status-info" },
  { key: "pendingAdmin", label: "with admin", className: "bg-status-warning" },
  { key: "done", label: "done", className: "bg-status-success" },
] as const;

export function PipelineStrip({ counts }: Props) {
  const total = counts.todo + counts.inProgress + counts.pendingAdmin + counts.done;
  if (total === 0) return null;

  return (
    <div className="space-y-2" aria-label="Course pipeline">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border/30">
        {SEGMENTS.map((s) => {
          const value = counts[s.key];
          if (value === 0) return null;
          const pct = (value / total) * 100;
          return (
            <div
              key={s.key}
              className={cn("h-full transition-all duration-500", s.className)}
              style={{ width: `${pct}%` }}
              aria-label={`${value} ${s.label}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", s.className)} />
            <span className="tabular-nums font-semibold text-foreground">{counts[s.key]}</span>
            <span>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
