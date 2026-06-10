"use client"

import { motion } from "framer-motion"
import { ArrowRight, ExternalLink } from "lucide-react"
import { SYSTEM_MIGRATION_CONFIG } from "@/lib/system-migration"
import { Button } from "@/components/ui/button"

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-12 text-white">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-2xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
          <ExternalLink className="h-4 w-4" />
          CourseBridge has moved
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-normal md:text-6xl">
          This domain is no longer active.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-white/70 md:text-xl">
          {SYSTEM_MIGRATION_CONFIG.REASON} Please continue on the new domain.
        </p>
        <p className="mt-6 break-all rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80">
          {SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}
        </p>
        <Button size="lg" className="mt-8 bg-white text-neutral-950 hover:bg-white/90" asChild>
          <a href={SYSTEM_MIGRATION_CONFIG.NEW_DOMAIN_URL}>
            Open new domain
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </motion.div>
    </main>
  )
}
