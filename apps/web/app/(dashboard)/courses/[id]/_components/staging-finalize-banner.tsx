"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { markStagingComplete } from "@/lib/workspace/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
}

export function StagingFinalizeBanner({ courseId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleComplete() {
    startTransition(async () => {
      const res = await markStagingComplete(courseId)
      if (!res.ok) {
        toast.error(res.error || "Failed to finalize staging.")
        return
      }
      setDone(true)
      toast.success("Course marked ready for instructor.")
    })
  }

  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-400",
        isPending && "opacity-60",
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Staging in Process</p>
      <p className="text-xs font-medium opacity-90">
        The admin has built the staging shell. Finalize the course, then mark it ready so
        Communications can send it to the instructor.
      </p>
      <Button
        size="sm"
        className="w-full gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        disabled={isPending || done}
        onClick={handleComplete}
      >
        <CheckCircle2 className="size-3.5" />
        {done ? "Marked ready" : isPending ? "Finalizing…" : "Mark Complete — Ready for Instructor"}
      </Button>
    </section>
  )
}
