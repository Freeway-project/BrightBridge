"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function HideButton({ notificationId }: { notificationId: string }) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (hidden) return null

  function onHide() {
    startTransition(async () => {
      setHidden(true) // optimistic
      try {
        const res = await fetch("/api/notifications/dismiss", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: notificationId }),
        })
        if (!res.ok) throw new Error("dismiss failed")
        router.refresh()
      } catch {
        setHidden(false)
        toast.error("Couldn't hide notification")
      }
    })
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7"
      aria-label="Hide"
      onClick={onHide}
      disabled={isPending}
    >
      <X className="size-3.5" />
    </Button>
  )
}
