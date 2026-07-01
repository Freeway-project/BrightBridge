"use client";
import { formatDaySeparator } from "@/lib/chat/format-time";

/** Centered day label rendered between message groups when the calendar day changes. */
export function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 select-none">
      <div className="h-px flex-1 bg-border" />
      {/* Formats in the viewer's local timezone, so it differs from SSR. */}
      <span className="text-xs font-medium text-muted-foreground" suppressHydrationWarning>
        {formatDaySeparator(iso)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
