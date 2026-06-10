import { GraduationCap } from "lucide-react"

/**
 * Executive welcome header for the Provost dashboard. Theme-aware gradient using
 * design tokens (primary/accent) so it adapts to light and dark.
 */
export function ProvostWelcomeBanner({ headline }: { headline: string }) {
  // Split "Welcome, Name — rest" into greeting + summary for typographic emphasis.
  const [greeting, summary] = headline.includes(" — ")
    ? headline.split(" — ", 2)
    : [headline, ""]

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex">
          <GraduationCap className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Provost · Institution-wide oversight
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{greeting}</h1>
          {summary && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{summary}</p>}
        </div>
      </div>
    </div>
  )
}
