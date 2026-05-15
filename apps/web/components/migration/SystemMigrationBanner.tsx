"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { getSystemMigrationStatus, SYSTEM_MIGRATION_CONFIG } from "@/lib/system-migration"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SystemMigrationBanner() {
  const pathname = usePathname()
  const [status, setStatus] = useState(getSystemMigrationStatus())

  useEffect(() => {
    const hostname = window.location.hostname
    setStatus(getSystemMigrationStatus(hostname))
    const interval = setInterval(() => {
      setStatus(getSystemMigrationStatus(hostname))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  if (status === "NORMAL" || pathname === "/maintenance") return null

  if (status === "ACTIVE") {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-neutral-950 px-6 text-white text-center">
        <div className="flex flex-col items-center gap-6 max-w-md">
          <h1 className="text-3xl font-semibold">This site has moved</h1>
          <p className="text-white/60 text-base leading-relaxed">
            Good morning. I know change is not always easy, but remember—beautiful things also grow in uncomfortable seasons. Wishing you a peaceful and fresh start today.
          </p>
          <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white/70">
            {SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}
          </div>
          <Button
            size="lg"
            className="w-full bg-white text-neutral-950 hover:bg-white/90"
            asChild
          >
            <a href={SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}>
              Go to new site
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </div>
    )
  }

  // ANNOUNCED: simple top banner
  return (
    <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-3 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-amber-200 text-sm">
      <span>CourseBridge is moving to a new domain.</span>
      <a
        href={SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}
        className="flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-100"
      >
        {SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL.replace("https://", "")}
        <ArrowRight className="size-3.5" />
      </a>
    </div>
  )
}
