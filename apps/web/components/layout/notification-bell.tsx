"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const POLL_INTERVAL = 15_000 // 15s — matches NotificationProvider

export function NotificationBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/count", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setCount(data.count ?? 0)
      } catch {
        // ignore
      }
    }

    void fetchCount()
    const id = setInterval(() => void fetchCount(), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${count} pending notifications` : "Notifications"}
      className="relative inline-flex items-center justify-center rounded-md p-2 text-yellow-400 transition-colors hover:bg-accent hover:text-yellow-300"
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-yellow-400 font-bold text-black leading-none",
            count > 99 ? "h-4 min-w-[1.1rem] px-1 text-[9px]" : "h-4 w-4 text-[10px]"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
