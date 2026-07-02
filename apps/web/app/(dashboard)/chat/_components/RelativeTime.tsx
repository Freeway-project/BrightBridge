"use client";
import { formatConversationTime, formatFullDateTime } from "@/lib/chat/format-time";

/**
 * Compact, viewer-local relative time (e.g. `2h`, `Yesterday`, `Jun 28`) for the
 * conversation list. Lives in a client component so it formats in the viewer's
 * timezone rather than the server's; `suppressHydrationWarning` covers the
 * expected SSR/client text difference.
 */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  const text = formatConversationTime(iso);
  if (!text) return null;
  return (
    <span className={className} title={iso ? formatFullDateTime(iso) : undefined} suppressHydrationWarning>
      {text}
    </span>
  );
}
