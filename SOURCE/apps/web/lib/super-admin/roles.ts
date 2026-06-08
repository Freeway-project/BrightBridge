// Shared vocabulary for org-unit leadership titles: pretty labels, seniority
// ranking, and presentation styles. Single source of truth so the hierarchy
// tree, its legend, the org-tree queries, and the unit-detail action all stay in
// sync. Plain module (no "use client"/"server-only") so both server and client
// can import it. The style class strings are literal so Tailwind's JIT keeps them.

export const ROLE_TITLE_LABELS: Record<string, string> = {
  vp: "VP",
  dean: "Dean",
  associate_dean: "Associate Dean",
  assistant_dean: "Assistant Dean",
  dept_head: "Department Head",
  educator: "Educator",
  admin: "Admin",
  staff: "Staff",
}

// Seniority order so leadership renders top-to-bottom within a unit
// (VP → Dean → … → Staff). Unknown titles sort last.
export const ROLE_TITLE_RANK: Record<string, number> = {
  vp: 0,
  dean: 1,
  associate_dean: 2,
  assistant_dean: 3,
  dept_head: 4,
  educator: 5,
  admin: 6,
  staff: 7,
}

export type RoleTitleStyle = { dot: string; text: string; chip: string }

// Chips use darker text in light mode (─700) for WCAG-AA contrast on pale theme
// backgrounds, and the lighter ─300 in dark mode. Fill/border kept subtle.
export const ROLE_TITLE_STYLES: Record<string, RoleTitleStyle> = {
  vp:             { dot: "bg-purple-500",  text: "text-purple-700 dark:text-purple-300",   chip: "border-purple-600/40 bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  dean:           { dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-300",       chip: "border-blue-600/40 bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  associate_dean: { dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-300",         chip: "border-sky-600/40 bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  assistant_dean: { dot: "bg-cyan-500",    text: "text-cyan-700 dark:text-cyan-300",       chip: "border-cyan-600/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  dept_head:      { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", chip: "border-emerald-600/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  educator:       { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300",     chip: "border-amber-600/40 bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  admin:          { dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-300",       chip: "border-rose-600/40 bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  staff:          { dot: "bg-slate-400",   text: "text-slate-600 dark:text-slate-200",     chip: "border-slate-500/40 bg-slate-400/15 text-slate-700 dark:text-slate-200" },
}

export const DEFAULT_ROLE_TITLE_STYLE: RoleTitleStyle = {
  dot: "bg-muted-foreground",
  text: "text-muted-foreground",
  chip: "border-border bg-muted text-muted-foreground",
}

export function roleTitleStyle(rawTitle?: string): RoleTitleStyle {
  return (rawTitle && ROLE_TITLE_STYLES[rawTitle]) || DEFAULT_ROLE_TITLE_STYLE
}

// Legend render order (matches seniority).
export const ROLE_LEGEND_ORDER = [
  "vp",
  "dean",
  "associate_dean",
  "assistant_dean",
  "dept_head",
  "educator",
  "admin",
  "staff",
] as const
