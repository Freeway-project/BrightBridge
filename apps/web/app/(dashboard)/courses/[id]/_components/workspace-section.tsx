import Link from "next/link"
import { Maximize2 } from "lucide-react"
import type { ReactNode } from "react"

type WorkspaceSectionProps = {
  /** Anchor id used by the side-nav scrollspy (e.g. "section-metadata"). */
  id: string
  step: number
  title: string
  subtitle?: string
  /** Dedicated route for the "Full view" of this section. Omit to hide the link. */
  fullViewHref?: string
  children: ReactNode
}

/**
 * Wraps one form/section inside the single-scroll workspace. Provides the anchor
 * the side-nav scrolls to, a clear divider header, and a "Full view" link back
 * to the section's dedicated step page.
 */
export function WorkspaceSection({ id, step, title, subtitle, fullViewHref, children }: WorkspaceSectionProps) {
  return (
    <section id={id} className="scroll-mt-6 pt-2">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between gap-4 border-b border-border/40 px-4 pb-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-[11px] font-black text-primary">
            {step}
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{subtitle}</p>}
          </div>
        </div>
        {fullViewHref && (
          <Link
            href={fullViewHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            <Maximize2 className="size-3.5" />
            Full view
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
