"use client"

import { useEffect, useState } from "react"
import { useSidebar } from "@/components/ui/sidebar"

type UpdateState = "checking" | "available" | "up_to_date"

type UpdateStatusTabProps = {
  initialVersion: string
}

const CHECK_INTERVAL = 1000 * 60 * 5

export function UpdateStatusTab({ initialVersion }: UpdateStatusTabProps) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const [updateState, setUpdateState] = useState<UpdateState>("checking")

  const shortVersion =
    initialVersion === "development" || initialVersion === "dev"
      ? "dev"
      : initialVersion.slice(0, 7)

  useEffect(() => {
    if (initialVersion === "development" || initialVersion === "dev") {
      setUpdateState("up_to_date")
      return
    }

    const checkVersion = async () => {
      setUpdateState("checking")
      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        if (!res.ok) {
          setUpdateState("up_to_date")
          return
        }
        const data = await res.json()
        const hasUpdate =
          Boolean(data.version) &&
          data.version !== initialVersion &&
          data.version !== "development"
        setUpdateState(hasUpdate ? "available" : "up_to_date")
      } catch {
        setUpdateState("up_to_date")
      }
    }

    void checkVersion()
    const interval = setInterval(() => void checkVersion(), CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [initialVersion])

  const label =
    updateState === "checking"
      ? "Checking updates..."
      : updateState === "available"
        ? "Update available"
        : "Up to date"

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2.5 transition-all hover:bg-primary/10">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Version v{shortVersion}</p>
      {!collapsed && <p className="mt-1 text-[11px] font-bold text-foreground/80 leading-tight">{label}</p>}
      <button
        className="mt-2 text-left text-[11px] font-black uppercase tracking-tighter text-primary hover:brightness-110 active:scale-95 transition-all"
        onClick={() => window.dispatchEvent(new Event("coursebridge:open-update-notice"))}
        type="button"
      >
        {updateState === "available" ? "★ Show update" : "Open update notice"}
      </button>
    </div>
  )
}
