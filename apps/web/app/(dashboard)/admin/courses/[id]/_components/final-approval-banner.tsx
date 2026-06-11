"use client"

import { useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { grantFinalApprovalAction } from "@/app/(dashboard)/admin/actions"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
}

export function FinalApprovalBanner({ courseId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      await grantFinalApprovalAction(courseId)
    })
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3",
      isPending && "opacity-60"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Instructor approved</p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
          The instructor has approved this course. Grant final approval to mark it ready for staging.
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={isPending}
        onClick={handleApprove}
      >
        <CheckCircle2 className="size-3.5" />
        {isPending ? "Approving…" : "Grant Final Approval"}
      </Button>
    </div>
  )
}
