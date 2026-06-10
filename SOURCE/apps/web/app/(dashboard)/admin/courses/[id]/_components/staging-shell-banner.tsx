"use client"

import { useTransition } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markStagingReadyAction } from "@/app/(dashboard)/admin/actions"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
}

export function StagingShellBanner({ courseId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handlePush() {
    startTransition(async () => {
      await markStagingReadyAction(courseId)
    })
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3",
      isPending && "opacity-60"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Building the staging shell</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          Once the staging shell is built, push the course back to the TA to finalize.
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        disabled={isPending}
        onClick={handlePush}
      >
        {isPending ? "Pushing…" : "Shell ready — push to TA"}
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  )
}
