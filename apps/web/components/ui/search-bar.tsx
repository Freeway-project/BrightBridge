"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SearchBarProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  /** Current input text (controlled). */
  value: string
  /** Fires on every keystroke — keep the input responsive. */
  onValueChange: (value: string) => void
  /**
   * Fires with the trimmed value after the debounce delay, and IMMEDIATELY on
   * Enter or when cleared. This is where you run the actual search
   * (navigate, fetch, filter, …). Omit for a purely visual search field.
   */
  onSearch?: (value: string) => void
  /** Debounce delay in ms for {@link onSearch}. `0` disables debouncing. Default 300. */
  debounceMs?: number
  /** Swap the search icon for a spinner while a search is in flight. */
  loading?: boolean
  /** Classes for the wrapper element. */
  containerClassName?: string
  /** Classes for the underlying `<input>`. */
  inputClassName?: string
  /** Show the clear (×) button when there is text. Default true. */
  showClear?: boolean
}

/**
 * Indigo-accented search field with a shared debounce contract.
 *
 * Every search box in the app used to re-implement its own `setTimeout`
 * debounce and almost none supported Enter-to-search. This centralizes that:
 * type → debounced `onSearch`; press Enter → flush the pending search
 * instantly; press Escape or hit × → clear and search empty.
 */
export function SearchBar({
  value,
  onValueChange,
  onSearch,
  debounceMs = 300,
  loading = false,
  containerClassName,
  inputClassName,
  showClear = true,
  placeholder = "Search…",
  onKeyDown,
  ...props
}: SearchBarProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Hold the latest onSearch so pending timers always call the current handler
  // without re-arming when its identity changes between renders.
  const onSearchRef = React.useRef(onSearch)
  React.useEffect(() => {
    onSearchRef.current = onSearch
  })

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Run the search now, cancelling any pending debounced call.
  const flush = React.useCallback(
    (next: string) => {
      clearTimer()
      onSearchRef.current?.(next.trim())
    },
    [clearTimer],
  )

  // Clear the timer if the field unmounts mid-debounce.
  React.useEffect(() => clearTimer, [clearTimer])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    onValueChange(next)
    if (!onSearch) return
    clearTimer()
    if (debounceMs <= 0) {
      onSearchRef.current?.(next.trim())
      return
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onSearchRef.current?.(next.trim())
    }, debounceMs)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      flush(value)
    } else if (e.key === "Escape" && value) {
      e.preventDefault()
      onValueChange("")
      flush("")
    }
    onKeyDown?.(e)
  }

  function handleClear() {
    onValueChange("")
    flush("")
  }

  const hasClear = showClear && value.length > 0

  return (
    <div className={cn("relative flex min-w-0 items-center", containerClassName)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-accent-indigo">
        {loading ? (
          <span
            aria-hidden
            className="block size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
          />
        ) : (
          <Search className="size-4" />
        )}
      </span>
      <input
        {...props}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        // Indigo-accented variant of ui/input: soft tint at rest, brighter
        // border + ring on focus so the search field reads as its own control.
        className={cn(
          "h-9 w-full min-w-0 rounded-lg border border-accent-indigo/35 bg-accent-indigo-soft py-1 pl-9 text-base shadow-xs outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-accent-indigo/60 focus-visible:border-accent-indigo focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-accent-indigo/30 disabled:pointer-events-none disabled:opacity-60 md:text-sm",
          hasClear ? "pr-9" : "pr-3",
          inputClassName,
        )}
      />
      {hasClear ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo/40"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
