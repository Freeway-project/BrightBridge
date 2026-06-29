/**
 * Human-friendly date/time formatting for the chat UI.
 *
 * All helpers take ISO 8601 strings (the shape the chat layer produces at the
 * DB boundary — see {@link file://./serialize.ts}) and format in the *local*
 * timezone. They are therefore meant to run client-side so each viewer sees
 * their own local time. The relative helpers accept an injectable `now` so they
 * are pure and deterministic under test (date-fns `isToday`/`isYesterday` read
 * the real system clock and can't be pinned, so we derive the relative buckets
 * from `differenceInCalendarDays` instead).
 *
 * Pure and dependency-free of `server-only` so they can be unit-tested directly.
 */
import { format, differenceInCalendarDays } from "date-fns"

/** Per-message time, e.g. `2:34 PM`. */
export function formatMessageTime(iso: string): string {
  return format(new Date(iso), "h:mm a")
}

/** Absolute date + time for tooltips, e.g. `Jun 29, 2026, 2:34 PM`. */
export function formatFullDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy, h:mm a")
}

/**
 * Day-separator label between message groups:
 * `Today` · `Yesterday` · `Friday` (within the past week) · `Mar 15` (this
 * year) · `Dec 31, 2025` (other year).
 */
export function formatDaySeparator(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const days = differenceInCalendarDays(now, d)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return format(d, "EEEE")
  if (d.getFullYear() === now.getFullYear()) return format(d, "MMM d")
  return format(d, "MMM d, yyyy")
}

/**
 * Compact relative time for the conversation list:
 * `` (none) · `now` · `15m` · `2h` · `Yesterday` · `Fri` · `Mar 15` ·
 * `Dec 31, 2025`.
 */
export function formatConversationTime(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return ""
  const d = new Date(iso)
  const diffMs = now.getTime() - d.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`

  const days = differenceInCalendarDays(now, d)
  if (days === 0) return `${Math.floor(diffMs / 3_600_000)}h`
  if (days === 1) return "Yesterday"
  if (days < 7) return format(d, "EEE")
  if (d.getFullYear() === now.getFullYear()) return format(d, "MMM d")
  return format(d, "MMM d, yyyy")
}
