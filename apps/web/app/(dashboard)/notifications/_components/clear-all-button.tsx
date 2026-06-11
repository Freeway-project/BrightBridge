"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ClearAllButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onClick() {
    if (!window.confirm("Hide all notifications? They will still appear in the audit trail.")) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications/dismiss-all", { method: "POST" })
        if (!res.ok) throw new Error("clear-all failed")
        router.refresh()
      } catch {
        toast.error("Couldn't clear notifications")
      }
    })
  }

  return (
    <Button variant="outline" size="sm" disabled={disabled || isPending} onClick={onClick}>
      {isPending ? "Clearing…" : "Clear all"}
    </Button>
  )
}
