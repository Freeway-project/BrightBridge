import { GraduationCap } from "lucide-react"

import { AnimatedBubbleParticles } from "@/components/ui/animated-bubble-particles"

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
    <AnimatedBubbleParticles
      className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/10 via-card to-accent/10 sm:p-6 p-5 backdrop-blur-md shadow-sm"
      height="100%"
      width="100%"
      particleColor="hsl(var(--primary))"
      particleSize={80}
      spawnInterval={400}
      enableGooEffect={true}
      blurStrength={18}
      zIndex={0}
      friction={{ min: 0.5, max: 1.5 }}
      scaleRange={{ min: 0.8, max: 2.5 }}
    >
      <div className="relative z-10 flex w-full items-start gap-4">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex backdrop-blur-md border border-primary/20">
          <GraduationCap className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80 dark:text-primary/60">
            Provost · Institution-wide oversight
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground drop-shadow-sm sm:text-2xl">{greeting}</h1>
          {summary && <p className="mt-1 text-sm font-medium text-foreground/80 sm:text-base">{summary}</p>}
        </div>
      </div>
    </AnimatedBubbleParticles>
  )
}
