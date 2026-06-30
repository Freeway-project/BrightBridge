import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./landing-reveal";

/**
 * Above-the-fold hero. Centered headline + CTAs, with a desktop "app window"
 * placeholder underneath that a real product screenshot can later drop into.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--primary)_14%,transparent)_0%,transparent_70%)]"
      />

      <div className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center md:pt-28 md:pb-20">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Okanagan College · Internal platform
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Course migration,
            <br />
            <span className="text-primary">done right.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The review workspace for moving Moodle courses into Brightspace — with
            clear ownership, staged approval, and an audit trail behind every decision.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="h-11 w-full px-6 text-sm sm:w-auto">
              <Link href="/auth/login">
                Open workspace
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full px-6 text-sm sm:w-auto">
              <a href="#workflow">See how it works</a>
            </Button>
          </div>
        </Reveal>
      </div>

      {/* Desktop product preview placeholder — swap in a real screenshot later. */}
      <Reveal delay={0.2}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-2xl shadow-black/40">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/40 px-4 py-3">
              <span className="size-3 rounded-full bg-foreground/15" />
              <span className="size-3 rounded-full bg-foreground/15" />
              <span className="size-3 rounded-full bg-foreground/15" />
              <span className="ml-3 hidden rounded-md bg-background/60 px-3 py-1 text-[11px] text-muted-foreground sm:inline">
                coursebridge.okanagancollege.app/dashboard
              </span>
            </div>
            {/* TODO: replace this block with <Image src="/screenshots/dashboard.png" … /> */}
            <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_92%,var(--primary)_8%),var(--background))]">
              <p className="text-sm text-muted-foreground">Dashboard preview coming soon</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
