"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OCLoadingLogo } from "@/components/shared/oc-loading-logo";
import { NAV_LINKS } from "./landing-data";

/**
 * Sticky, glassy top bar. Collapses the in-page links into a toggle menu on
 * small screens; the "Sign in" CTA is always reachable.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <OCLoadingLogo className="size-8 shrink-0" />
          <span className="text-base font-semibold tracking-tight">CourseBridge</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="h-9 px-4">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild className="h-9 px-4">
            <Link href="/auth/login">Open workspace</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="mt-2 h-10">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
